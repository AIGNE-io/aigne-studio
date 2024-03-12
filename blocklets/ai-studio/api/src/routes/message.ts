import History from '@api/store/models/history';
import { auth, user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';

export function messageRoutes(router: Router) {
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
