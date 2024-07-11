import { ensureComponentCallOrAdmin } from '@api/libs/security';
import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';

import Memory from '../store/models/memory';

const router = Router();

const getMemoriesQuerySchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  agentId?: string;
  projectId?: string;
  scope?: string;
  key: string;
}>({
  userId: Joi.string().empty([null, '']),
  sessionId: Joi.string().empty([null, '']),
  agentId: Joi.string().empty([null, '']),
  projectId: Joi.string().empty([null, '']),
  scope: Joi.string().empty([null, '']),
  key: Joi.string().required(),
});

const createMemoryInputSchema = Joi.object<{
  key: string;
  scope: 'user' | 'session' | 'global';
  data: any;
}>({
  key: Joi.string().required(),
  data: Joi.any(),
  scope: Joi.string().empty([null, '']),
});

const createMemoryQuerySchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  agentId?: string;
  projectId?: string;
  reset: boolean;
}>({
  sessionId: Joi.string().empty([null, '']),
  agentId: Joi.string().empty([null, '']),
  userId: Joi.string().empty([null, '']).required(),
  projectId: Joi.string().empty([null, '']).required(),
  reset: Joi.boolean().default(false),
});

const updateMemoryQuerySchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  agentId?: string;
  projectId?: string;
  key?: string;
  id?: string;
  scope?: string;
}>({
  id: Joi.string().allow('').empty([null, '']).optional(),
  key: Joi.string().allow('').empty([null, '']).optional(),
  userId: Joi.string().empty([null, '']),
  sessionId: Joi.string().empty([null, '']),
  agentId: Joi.string().empty([null, '']),
  projectId: Joi.string().empty([null, '']),
  scope: Joi.string().empty([null, '']),
});

const getMemoryQuerySchema = Joi.object<{
  offset?: number;
  limit?: number;
  key: string;
  scope: string;
  projectId?: string;
  userId?: string;
  sessionId?: string;
  agentId?: string;
}>({
  offset: Joi.number().integer().min(0).empty([null, '']).default(0).optional(),
  limit: Joi.number().integer().min(1).empty([null, '']).default(5).optional(),
  key: Joi.string().allow('').empty([null, '']).default(''),
  scope: Joi.string().valid('global', 'session', 'user').default('global').required(),
  userId: Joi.string().empty([null, '']),
  sessionId: Joi.string().empty([null, '']),
  agentId: Joi.string().empty([null, '']),
  projectId: Joi.string().empty([null, '']),
});

router.get('/', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const {
    userId = '',
    sessionId = '',
    agentId = '',
    projectId = '',
    key = '',
    scope = '',
  } = await getMemoriesQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const currentUserId = req.user?.did || userId || '';
  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  const params: { [key: string]: string } = {
    ...(currentUserId && { userId: currentUserId }),
    ...(sessionId && { sessionId }),
    ...(projectId && { projectId }),
    ...(agentId && { agentId }),
    ...(scope && { scope }),
    ...(key && { key }),
  };

  const datastores = await Memory.findAll({ order: [['createdAt', 'ASC']], where: params });
  res.json(datastores);
});

router.post('/', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const { key, data, scope } = await createMemoryInputSchema.validateAsync(req.body, { stripUnknown: true });
  const { userId, sessionId, agentId, projectId, reset } = await createMemoryQuerySchema.validateAsync(req.query, {
    stripUnknown: true,
  });

  const currentUserId = req.user?.did || userId || '';
  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  if (reset) await Memory.destroy({ where: { ...(scope && { scope }), ...(key && { key }) } });

  const datastore = await Memory.create({
    key,
    scope,
    data,
    userId: currentUserId,
    sessionId,
    agentId,
    projectId,
  });
  res.json(datastore);
});

router.put('/', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const {
    userId = '',
    sessionId = '',
    agentId = '',
    projectId = '',
    key = '',
    id = '',
    scope = '',
  } = await updateMemoryQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const currentUserId = req.user?.did || userId || '';

  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  const params: { [key: string]: string } = {
    ...(currentUserId && { userId: currentUserId }),
    ...(sessionId && { sessionId }),
    ...(agentId && { agentId }),
    ...(projectId && { projectId }),
    ...(key && { key }),
    ...(scope && { scope }),
    ...(id && { id }),
  };

  const { data } = await Joi.object<{ data: any }>({ data: Joi.any() }).validateAsync(req.body, { stripUnknown: true });

  const dataItem = await Memory.findOne({ where: params });
  if (!dataItem) {
    res.status(404).json({ error: 'No such datastore' });
    return;
  }

  const result = await dataItem.update({ data });
  res.json(result);
});

router.delete('/', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const {
    userId = '',
    sessionId = '',
    agentId = '',
    projectId = '',
    scope = '',
    key = '',
    id = '',
  } = await updateMemoryQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const currentUserId = req.user?.did || userId || '';
  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  const params: { [key: string]: string } = {
    ...(currentUserId && { userId: currentUserId }),
    ...(sessionId && { sessionId }),
    ...(projectId && { projectId }),
    ...(agentId && { agentId }),
    ...(key && { key }),
    ...(scope && { scope }),
    ...(id && { id }),
  };

  try {
    await Memory.destroy({ where: params });

    res.json({ data: 'success' });
  } catch (error) {
    console.error(error?.message);
    res.status(500).json({ error: error?.message });
  }
});

router.get('/variable-by-query', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const query = await getMemoryQuerySchema.validateAsync(req.query, { stripUnknown: true });
  const { key, projectId, scope, sessionId, userId } = query;

  const currentUserId = req.user?.did || userId || '';
  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  const params: { [key: string]: any } = {
    ...(currentUserId && { userId: currentUserId }),
    ...(projectId && { projectId }),
    ...(key && { key }),
  };

  if (scope === 'session') {
    const datastores = await Memory.findAll({
      order: [['createdAt', 'ASC']],
      where: { ...params, scope, sessionId },
    });
    if (datastores.length) {
      return res.json({ datastores });
    }
  }

  if (scope === 'session' || scope === 'user') {
    const datastores = await Memory.findAll({
      order: [['createdAt', 'ASC']],
      where: { ...params, scope: 'user' },
    });
    if (datastores.length) {
      return res.json({ datastores });
    }
  }

  if (scope === 'session' || scope === 'user' || scope === 'global') {
    const datastores = await Memory.findAll({
      order: [['createdAt', 'ASC']],
      where: { ...params, scope: 'global' },
    });
    if (datastores.length) {
      return res.json({ datastores });
    }
  }

  return res.json({ datastores: [] });
});

export default router;
