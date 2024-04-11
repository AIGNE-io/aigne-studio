import History from '@api/store/models/history';
import { auth, user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import { uniqBy, zip } from 'lodash';
import orderBy from 'lodash/orderBy';
import { Attributes, FindOptions, Op, cast, col, where } from 'sequelize';

const searchOptionsSchema = Joi.object<{ sessionId: string; userId: string; limit: number; keyword?: string }>({
  sessionId: Joi.string().required(),
  userId: Joi.string().required(),
  limit: Joi.number().empty([null, '']).integer().min(1).optional().default(10),
  keyword: Joi.string().empty([null, '']),
});

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
    const query = await searchOptionsSchema.validateAsync(req.query, { stripUnknown: true });

    if (!query.sessionId || !query.userId) {
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
        userId: query.userId,
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
            { role: 'assistant', content: result },
          ];
        }

        return [];
      })
      .slice(0, query.limit)
      .flat();

    res.json(messages);
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
        error: i.error,
      })),
      count,
    });
  });

  router.delete('/sessions/:sessionId/messages', user(), auth(), async (req, res) => {
    const { did: userId } = req.user!;
    const { sessionId } = req.params;

    const deletedCount = await History.destroy({
      where: { userId, sessionId },
    });

    res.json({ deletedCount });
  });
}
