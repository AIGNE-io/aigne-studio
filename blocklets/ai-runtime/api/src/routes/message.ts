import { NotFoundError } from '@api/libs/error';
import History from '@api/store/models/history';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import middlewares from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import { isNil, omitBy } from 'lodash';
import orderBy from 'lodash/orderBy';
import pick from 'lodash/pick';
import uniqBy from 'lodash/uniqBy';
import zip from 'lodash/zip';
import { Attributes, FindOptions, InferAttributes, Op, WhereOptions, cast, col, where } from 'sequelize';

const searchOptionsSchema = Joi.object<{ sessionId: string; limit: number; keyword?: string }>({
  sessionId: Joi.string().required(),
  limit: Joi.number().empty([null, '']).integer().min(1).optional().default(10),
  keyword: Joi.string().empty([null, '']),
});

export function messageRoutes(router: Router) {
  router.get('/messages', middlewares.session({ componentCall: true }), async (req, res) => {
    const query = await searchOptionsSchema.validateAsync(req.query, { stripUnknown: true });
    const userId = req.user?.method === 'componentCall' ? req.query.userId : req.user?.did;

    const conditions = [];

    if (query.keyword) {
      const condition = `%${query.keyword}%`;

      conditions.push({
        [Op.or]: [
          where(cast(col('inputs'), 'CHAR'), 'LIKE', condition),
          where(cast(col('outputs'), 'CHAR'), 'LIKE', condition),
        ],
      });
    }

    const queryOptions: FindOptions<Attributes<History>> = {
      where: {
        ...omitBy({ sessionId: query.sessionId, userId }, (v) => isNil(v)),
        outputs: { [Op.not]: null },
        error: { [Op.is]: null },
      },
      order: [['createdAt', 'DESC']],
      limit: query.limit,
    };

    // 查找历史记录：最后 n 条 + 关键词匹配 n 条
    const lastMessages = await History.findAll(queryOptions);
    const searchMessages =
      lastMessages.length && conditions.length
        ? await History.findAll({
            ...queryOptions,
            where: {
              ...queryOptions.where,
              id: { [Op.lt]: lastMessages[lastMessages.length - 1]?.id },
              [Op.and]: conditions,
            },
          })
        : [];

    // 交替组合最后n条消息和关键词匹配到的n条消息，去重后取n条，并按时间排序
    const messages = orderBy(uniqBy(zip(lastMessages, searchMessages).flat(), 'id'), 'createdAt', 'asc')
      .map((i) => {
        const question = i?.inputs?.question;
        const result = i?.outputs?.objects?.find((i) => i?.[RuntimeOutputVariable.text])?.[RuntimeOutputVariable.text];

        if (typeof question === 'string' && question && typeof result === 'string' && result) {
          return [
            { role: 'user', content: question },
            { role: 'assistant', content: result, agentId: i.agentId },
          ];
        }

        return [];
      })
      .slice(0, query.limit)
      .flat();

    res.json({ messages });
  });

  router.get('/messages/:messageId', async (req, res) => {
    const { messageId } = req.params;

    if (!messageId) throw new Error('Missing required param `messageId`');
    const message = await History.findByPk(messageId, { rejectOnEmpty: new NotFoundError('No such message') });
    res.json({
      ...message.dataValues,
      aid: stringifyIdentity({
        blockletDid: message.blockletDid,
        projectId: message.projectId,
        projectRef: message.projectRef,
        agentId: message.agentId,
      }),
    });
  });

  const getMessagesQuerySchema = Joi.object<{
    limit: number;
    before?: string;
    after?: string;
    orderDirection: 'asc' | 'desc';
  }>({
    limit: Joi.number().empty([null, '']).integer().min(1).max(1000).default(100),
    before: Joi.string().empty([null, '']),
    after: Joi.string().empty([null, '']),
    orderDirection: Joi.string().empty([null, '']).valid('asc', 'desc').default('desc'),
  });

  router.get('/sessions/:sessionId/messages', middlewares.session(), middlewares.auth(), async (req, res) => {
    const { did: userId } = req.user!;

    const { sessionId } = req.params;
    if (!sessionId) throw new Error('Missing required param `sessionId`');

    const query = await getMessagesQuerySchema.validateAsync(req.query, { stripUnknown: true });

    const where: WhereOptions<InferAttributes<History>> = { userId, sessionId };

    if (query.before) {
      where.id = { ...(typeof where.id === 'object' ? where.id : {}), [Op.lt]: query.before };
    }
    if (query.after) {
      where.id = { ...(typeof where.id === 'object' ? where.id : {}), [Op.gt]: query.after };
    }

    const { rows: messages, count } = await History.findAndCountAll({
      where,
      order: [['id', query.orderDirection]],
      limit: query.limit,
    });

    res.json({
      messages: messages.map((i) => ({
        ...pick(i, ['id', 'sessionId', 'agentId', 'createdAt', 'updatedAt', 'inputs', 'outputs', 'error']),
        aid: stringifyIdentity({
          blockletDid: i.blockletDid,
          projectId: i.projectId,
          projectRef: i.projectRef,
          agentId: i.agentId,
        }),
      })),
      count,
    });
  });

  router.delete('/sessions/:sessionId/messages', middlewares.session(), middlewares.auth(), async (req, res) => {
    const { did: userId } = req.user!;
    const { sessionId } = req.params;

    const deletedCount = await History.destroy({
      where: { userId, sessionId },
    });

    res.json({ deletedCount });
  });

  const getPageSchema = Joi.object<{
    page: number;
    size: number;
    projectId: string;
    sessionId?: string;
    agentId?: string;
    date?: string;
  }>({
    page: Joi.number().integer().min(1).default(1),
    size: Joi.number().integer().min(1).max(100).default(20),
    projectId: Joi.string().required(),
    sessionId: Joi.string().empty([null, '']),
    agentId: Joi.string().empty([null, '']),
    date: Joi.date().iso().empty(['', null]),
  });

  router.get('/history', middlewares.session(), middlewares.auth(), async (req, res) => {
    const { page, size, sessionId, projectId, agentId, ...query } = await getPageSchema.validateAsync(req.query, {
      stripUnknown: true,
    });

    const where: WhereOptions<InferAttributes<History>> = { projectId };

    if (sessionId) {
      where.sessionId = sessionId;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    if (query.date) {
      where.createdAt = {};
      if (query.date) {
        (where.createdAt as any)[Op.gte] = new Date(query.date);
      }

      // 将结束日期设置为当天的23:59:59，以包含整个结束日期
      const endDate = new Date(query.date);
      endDate.setHours(23, 59, 59, 999);
      (where.createdAt as any)[Op.lte] = endDate;
    }

    const { rows: messages, count } = await History.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      offset: (page - 1) * size,
      limit: size,
    });

    res.json({
      messages: messages.map((i) => ({
        ...i.dataValues,
        aid: stringifyIdentity({
          blockletDid: i.blockletDid,
          projectId: i.projectId,
          projectRef: i.projectRef,
          agentId: i.agentId,
        }),
      })),
      count,
    });
  });
}
