import Session from '@api/store/models/session';
import { auth, user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';

export function sessionRoutes(router: Router) {
  const sessionsQuerySchema = Joi.object<{
    projectId: string;
    projectRef: string;
    assistantId: string;
  }>({
    projectId: Joi.string().required(),
    projectRef: Joi.string().required(),
    assistantId: Joi.string().required(),
  });

  router.get('/sessions', user(), auth(), async (req, res) => {
    const { did: userId } = req.user!;
    const query = await sessionsQuerySchema.validateAsync(req.query, { stripUnknown: true });

    const sessions = await Session.getUserSessions({
      userId,
      projectId: query.projectId,
      projectRef: query.projectRef,
      assistantId: query.assistantId,
    });

    res.json({
      sessions,
    });
  });

  const createSessionInput = Joi.object<{
    projectId: string;
    projectRef: string;
    assistantId: string;
    name?: string;
    parameters?: object;
  }>({
    projectId: Joi.string().required(),
    projectRef: Joi.string().required(),
    assistantId: Joi.string().required(),
    name: Joi.string().empty(['', null]),
    parameters: Joi.object().pattern(Joi.string(), Joi.any()),
  });

  router.post('/sessions', user(), auth(), async (req, res) => {
    const { did: userId } = req.user!;
    const input = await createSessionInput.validateAsync(req.body, { stripUnknown: true });

    const session = await Session.create({
      userId,
      projectId: input.projectId,
      projectRef: input.projectRef,
      assistantId: input.assistantId,
      name: input.name,
      parameters: input.parameters,
    });

    const sessions = await Session.getUserSessions({
      userId,
      projectId: input.projectId,
      projectRef: input.projectRef,
      assistantId: input.assistantId,
    });

    res.json({
      created: session,
      sessions,
    });
  });

  const updateSessionInput = Joi.object<{
    name?: string;
    parameters?: object;
  }>({
    name: Joi.string().empty(['', null]),
    parameters: Joi.object().pattern(Joi.string(), Joi.any()),
  });

  router.patch('/sessions/:sessionId', user(), auth(), async (req, res) => {
    const { did: userId } = req.user!;
    const { sessionId } = req.params;
    const input = await updateSessionInput.validateAsync(req.body, { stripUnknown: true });

    const session = await Session.findOne({
      where: { id: sessionId, userId },
      rejectOnEmpty: new Error(`Session ${sessionId} not found`),
    });

    await session.update({
      name: input.name,
      parameters: input.parameters,
    });

    const sessions = await Session.getUserSessions({
      userId,
      projectId: session.projectId,
      projectRef: session.projectRef,
      assistantId: session.assistantId,
    });

    res.json({
      updated: session,
      sessions,
    });
  });

  router.delete('/sessions/:sessionId', user(), auth(), async (req, res) => {
    const { did: userId } = req.user!;
    const { sessionId } = req.params;

    const session = await Session.findOne({
      where: { userId, id: sessionId },
      rejectOnEmpty: new Error(`Session ${sessionId} not found`),
    });
    await session.destroy();

    const sessions = await Session.getUserSessions({
      userId,
      projectId: session.projectId,
      projectRef: session.projectRef,
      assistantId: session.assistantId,
    });

    res.json({
      deleted: session,
      sessions,
    });
  });

  router.delete('/sessions', user(), auth(), async (req, res) => {
    const { did: userId } = req.user!;

    const query = await sessionsQuerySchema.validateAsync(req.query, { stripUnknown: true });

    const deletedCount = await Session.destroy({
      where: { userId, projectId: query.projectId, projectRef: query.projectRef, assistantId: query.assistantId },
    });

    res.json({ deletedCount });
  });
}
