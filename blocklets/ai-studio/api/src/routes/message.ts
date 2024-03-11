import History from '@api/store/models/history';
import { auth, user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import { uniqBy } from 'lodash';
import { FindOptions, Op, cast, col, where } from 'sequelize';

const searchOptionsSchema = Joi.object({
  sessionId: Joi.string().allow('').optional(),
  limit: Joi.number().integer().min(1).allow('').optional(),
  keyword: Joi.string().allow('').optional(),
});

interface QueryOptions extends FindOptions {
  where: { [Op.and]?: any[] };
}

const getPrevNextHistories = async (currentHistory: History) => {
  const prevHistory = await History.findOne({
    where: {
      createdAt: {
        [Op.lt]: currentHistory.createdAt,
      },
    },
    order: [['createdAt', 'DESC']],
    limit: 1,
  });

  const nextHistory = await History.findOne({
    where: {
      createdAt: {
        [Op.gt]: currentHistory.createdAt,
      },
    },
    order: [['createdAt', 'ASC']],
    limit: 1,
  });

  return [prevHistory, currentHistory, nextHistory].filter((i): i is NonNullable<typeof i> => !!i);
};

export function messageRoutes(router: Router) {
  /**
   * @openapi
   * /api/sessions/messages:
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
  router.get('/sessions/messages', user(), async (req, res) => {
    try {
      if (req.query?.limit) {
        // @ts-ignore
        req.query.limit = Number(req.query.limit);
      }

      const { error, value } = searchOptionsSchema.validate(req.query);
      if (error) {
        throw new Error(`Validation error: ${error.message}`);
      }

      const queryOptions: QueryOptions = { where: {}, order: [['createdAt', 'DESC']] };
      const conditions = [];

      if (value.limit) {
        queryOptions.limit = Number(value.limit);
      }

      if (value.sessionId) {
        conditions.push({ sessionId: value.sessionId });
      }

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

      res.json(
        results
          .filter((x) => x.result)
          .map((i) => ({
            role: 'system',
            content: typeof i.result === 'string' ? i.result : JSON.stringify(i.result),
          }))
      );
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
