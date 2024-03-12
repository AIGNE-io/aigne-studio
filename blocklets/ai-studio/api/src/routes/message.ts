import History from '@api/store/models/history';
import { auth, user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import { uniqBy } from 'lodash';
import orderBy from 'lodash/orderBy';
import { FindOptions, Op, cast, col, where } from 'sequelize';

const searchOptionsSchema = Joi.object({
  sessionId: Joi.string().allow('').optional(),
  userId: Joi.string().allow('').optional(),
  assistantId: Joi.string().allow('').optional(),
  limit: Joi.number().integer().min(1).allow('').optional(),
  keyword: Joi.string().allow('').optional(),
});

interface QueryOptions extends FindOptions {
  where: {
    [Op.and]?: any[];
    sessionId: string;
    userId?: string;
    assistantId?: string;
  };
}

const getPrevNextHistories = async (currentHistory: History) => {
  const prevHistory = await History.findOne({
    where: {
      createdAt: {
        [Op.lt]: currentHistory.createdAt,
      },
      sessionId: currentHistory.sessionId,
    },
    order: [['createdAt', 'DESC']],
    limit: 1,
  });

  const nextHistory = await History.findOne({
    where: {
      createdAt: {
        [Op.gt]: currentHistory.createdAt,
      },
      sessionId: currentHistory.sessionId,
    },
    order: [['createdAt', 'ASC']],
    limit: 1,
  });

  return [prevHistory, currentHistory, nextHistory].filter((i): i is NonNullable<typeof i> => !!i);
};

export function messageRoutes(router: Router) {
  /**
   * @openapi
   * /api/messages:
   *   get:
   *     summary: Get history messages
   *     x-summary-zh: 获取历史信息
   *     description: Retrieve messages based on sessionId, last N messages, or keyword
   *     x-description-zh: 根据 sessionId、最后N条消息或关键字检索历史消息
   *     tags:
   *       - Sessions
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Number of last messages to retrieve
   *         x-description-zh: 检索的消息的数目
   *       - in: query
   *         name: keyword
   *         schema:
   *           type: string
   *         description: Keyword to search in messages
   *         x-description-zh: 在消息中搜索的关键字
   *     responses:
   *       '200':
   *         description: A list of history messages
   *         x-description-zh: 检索历史消息列表
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 messages:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: string
   *                       taskId:
   *                         type: string
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                       updatedAt:
   *                         type: string
   *                         format: date-time
   *                       parameters:
   *                         type: object
   *                       result:
   *                         type: object
   */
  router.get('/messages', user(), async (req, res) => {
    try {
      const value = await searchOptionsSchema.validateAsync(req.query, { stripUnknown: true });

      const list = [value.sessionId, value.userId, value.assistantId];
      if (list.some((x) => !x)) {
        res.json([{ role: 'assistant', content: '' }]);
        return;
      }

      const queryOptions: QueryOptions = {
        where: { sessionId: value.sessionId, userId: value.userId, assistantId: value.assistantId },
        order: [['createdAt', 'DESC']],
      };

      if (value.limit) {
        queryOptions.limit = value.limit;
      }

      const conditions = [];
      if (value.keyword) {
        const condition = `%${value.keyword}%`;

        conditions.push({
          [Op.or]: [
            where(cast(col('parameters'), 'CHAR'), 'LIKE', condition),
            where(cast(col('result'), 'CHAR'), 'LIKE', condition),
          ],
        });
      }
      if (conditions?.length) {
        queryOptions.where[Op.and] = conditions;
      }

      const { rows: messages } = await History.findAndCountAll(queryOptions);

      let results: History[] = messages;
      if (queryOptions.limit) {
        results = uniqBy(
          (await Promise.all(messages.map(async (message) => getPrevNextHistories(message)))).flat(),
          'id'
        );
      }

      const filterResult = results.filter((x) => x.result && !x.error);
      const orderResult = orderBy(filterResult, ['createdAt'], ['asc']);
      const formattedResult = orderResult.flatMap((i) => [
        { role: 'user', content: typeof i.parameters === 'string' ? i.parameters : JSON.stringify(i.parameters) },
        { role: 'assistant', content: typeof i.result === 'string' ? i.result : JSON.stringify(i.result) },
      ]);

      res.json(formattedResult);
    } catch (error) {
      res.status(500).json({ message: error?.message });
    }
  });

  router.get('/sessions/:sessionId/messages', user(), auth(), async (req, res) => {
    const { did: userId } = req.user!;
    const { sessionId } = req.params;

    const { rows: messages, count } = await History.findAndCountAll({
      where: { userId, sessionId },
      order: [['id', 'desc']],
      limit: 100,
    });

    res.json({
      messages: messages.reverse().map((i) => ({
        id: i.id,
        taskId: i.taskId,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
        parameters: i.parameters,
        result: i.result,
      })),
      count,
    });
  });
}
