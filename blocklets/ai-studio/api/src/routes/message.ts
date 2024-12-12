import History from '@api/store/models/history';
import middlewares from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import { pick, uniqBy, zip } from 'lodash';
import orderBy from 'lodash/orderBy';
import { Attributes, FindOptions, InferAttributes, Op, WhereOptions, cast, col, where } from 'sequelize';

const searchOptionsSchema = Joi.object<{ sessionId?: string; limit: number; keyword?: string }>({
  sessionId: Joi.string().empty([null, '']),
  limit: Joi.number().empty([null, '']).integer().min(1).optional().default(10),
  keyword: Joi.string().empty([null, '']),
});

// TODO 直接删除？ 目前都是使用了 runtime 的接口
export function messageRoutes(router: Router) {
  router.get('/messages', middlewares.session(), async (req, res) => {
    const query = await searchOptionsSchema.validateAsync(req.query, { stripUnknown: true });
    const { did: userId } = req.user!;

    if (!query.sessionId || !userId) {
      res.json([]);
      return;
    }

    const conditions = [];

    if (query.keyword) {
      const condition = `%${query.keyword}%`;

      conditions.push({
        [Op.or]: [
          where(cast(col('parameters'), 'CHAR'), 'LIKE', condition),
          where(cast(col('result'), 'CHAR'), 'LIKE', condition),
        ],
      });
    }

    const queryOptions: FindOptions<Attributes<History>> = {
      where: {
        sessionId: query.sessionId,
        userId,
        result: { [Op.not]: null },
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
        const question = i?.parameters?.question;
        const result =
          i?.result?.content ||
          i?.result?.messages
            ?.filter((i) => i.respondAs === 'message')
            .map((i) => (typeof i.result?.content === 'string' ? i.result.content : ''))
            .join('\n');

        if (typeof question === 'string' && question && typeof result === 'string' && result) {
          return [
            { role: 'user', content: question },
            { role: 'assistant', content: result, assistantId: i.assistantId },
          ];
        }

        return [];
      })
      .slice(0, query.limit)
      .flat();

    res.json(messages);
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
      messages: messages.map((i) =>
        pick(i, ['id', 'sessionId', 'assistantId', 'taskId', 'createdAt', 'updatedAt', 'parameters', 'result', 'error'])
      ),
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
}
