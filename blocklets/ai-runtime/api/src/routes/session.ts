import Session from '@api/store/models/session';
import { parseIdentity, stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import middlewares from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';

import Histories from '../store/models/history';

export function sessionRoutes(router: Router) {
  const sessionsQuerySchema = Joi.object<{ aid: string }>({ aid: Joi.string().required() });

  router.get('/sessions', middlewares.session(), middlewares.auth(), async (req, res) => {
    const { did: userId } = req.user!;
    const query = await sessionsQuerySchema.validateAsync(req.query, { stripUnknown: true });

    const { projectId, agentId } = parseIdentity(query.aid, { rejectWhenError: true });

    const sessions = await Session.getUserSessions({
      userId,
      projectId,
      agentId,
    });

    res.json({ sessions });
  });

  router.get('/sessions/:sessionId', middlewares.session(), middlewares.auth(), async (req, res) => {
    const { did: userId } = req.user!;
    const { sessionId } = req.params;
    if (!sessionId) throw new Error('Missing required param sessionId');

    const session = await Session.findOne({
      where: { id: sessionId, userId },
      rejectOnEmpty: new Error(`Session ${sessionId} not found`),
    });

    res.json({ session });
  });

  const createSessionInput = Joi.object<{
    aid: string;
    name?: string;
  }>({
    aid: Joi.string().required(),
    name: Joi.string().empty(['', null]),
  });

  router.post('/sessions', middlewares.session(), middlewares.auth(), async (req, res) => {
    const { did: userId } = req.user!;
    const input = await createSessionInput.validateAsync(
      {
        ...req.body,
        // 兼容旧版的接口参数，一段时间后删掉下面这行
        aid: req.body.aid ?? stringifyIdentity(req.body),
      },
      { stripUnknown: true }
    );

    const { projectId, agentId } = parseIdentity(input.aid, { rejectWhenError: true });

    const session = await Session.create({ userId, projectId, agentId, name: input.name });
    const sessions = await Session.getUserSessions({ userId, projectId, agentId });

    res.json({ created: session, sessions });
  });

  const updateSessionInput = Joi.object<{
    name?: string;
  }>({
    name: Joi.string().empty(['', null]),
  });

  router.patch('/sessions/:sessionId', middlewares.session(), middlewares.auth(), async (req, res) => {
    const { did: userId } = req.user!;
    const { sessionId } = req.params;
    const input = await updateSessionInput.validateAsync(req.body, { stripUnknown: true });

    const session = await Session.findOne({
      where: { id: sessionId, userId },
      rejectOnEmpty: new Error(`Session ${sessionId} not found`),
    });

    await session.update({ name: input.name });

    const sessions = await Session.getUserSessions({
      userId,
      projectId: session.projectId,
      agentId: session.agentId,
    });

    res.json({
      updated: session,
      sessions,
    });
  });

  router.delete('/sessions/:sessionId', middlewares.session(), middlewares.auth(), async (req, res) => {
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
      agentId: session.agentId,
    });

    res.json({
      deleted: session,
      sessions,
    });
  });

  router.post('/sessions/:sessionId/clear', middlewares.session(), middlewares.auth(), async (req, res) => {
    const { sessionId } = req.params;
    const { did: userId } = req.user!;

    // check session's owner
    await Session.findOne({
      where: { id: sessionId, userId },
      rejectOnEmpty: new Error('No such session'),
    });

    await Histories.destroy({ where: { sessionId } });

    res.json({});
  });

  router.delete('/sessions', middlewares.session(), middlewares.auth(), async (req, res) => {
    const { did: userId } = req.user!;

    const query = await sessionsQuerySchema.validateAsync(req.query, { stripUnknown: true });
    const { projectId, agentId } = parseIdentity(query.aid, { rejectWhenError: true });

    const deletedCount = await Session.destroy({
      where: { userId, projectId, agentId },
    });

    res.json({ deletedCount });
  });
}
