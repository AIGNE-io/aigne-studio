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
    const query = await sessionsQuerySchema.validateAsync(
      {
        ...req.query,
        // 兼容旧版的接口参数，一段时间后删掉下面这行
        aid: req.query.aid ?? stringifyIdentity(req.query as any),
      },
      { stripUnknown: true }
    );

    const {
      projectId,
      projectRef = 'main',
      agentId: assistantId,
    } = parseIdentity(query.aid, { rejectWhenError: true });

    const sessions = await Session.getUserSessions({
      userId,
      projectId,
      projectRef,
      assistantId,
    });

    res.json({
      sessions,
    });
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

    const {
      projectId,
      projectRef = 'main',
      agentId: assistantId,
    } = parseIdentity(input.aid, { rejectWhenError: true });

    const session = await Session.create({ userId, projectId, projectRef, assistantId, name: input.name });
    const sessions = await Session.getUserSessions({ userId, projectId, projectRef, assistantId });

    res.json({ created: session, sessions });
  });

  const updateSessionInput = Joi.object<{
    name?: string;
    parameters?: object;
  }>({
    name: Joi.string().empty(['', null]),
    parameters: Joi.object().pattern(Joi.string(), Joi.any()),
  });

  router.patch('/sessions/:sessionId', middlewares.session(), middlewares.auth(), async (req, res) => {
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
      projectRef: session.projectRef,
      assistantId: session.assistantId,
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

    const query = await sessionsQuerySchema.validateAsync(
      {
        ...req.query,
        // 兼容旧版的接口参数，一段时间后删掉下面这行
        aid: req.query.aid ?? stringifyIdentity(req.query as any),
      },
      { stripUnknown: true }
    );
    const { projectId, projectRef, agentId: assistantId } = parseIdentity(query.aid, { rejectWhenError: true });

    const deletedCount = await Session.destroy({
      where: { userId, projectId, projectRef, assistantId },
    });

    res.json({ deletedCount });
  });
}
