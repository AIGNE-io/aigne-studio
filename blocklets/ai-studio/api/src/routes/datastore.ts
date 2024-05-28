import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';

import { ensureComponentCallOrAuth } from '../libs/security';
import Datastore from '../store/models/datastore';

const router = Router();

const getDatastoreSchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  assistantId?: string;
  projectId?: string;
  scope?: string;
  key: string;
}>({
  userId: Joi.string().empty([null, '']),
  sessionId: Joi.string().empty([null, '']),
  assistantId: Joi.string().empty([null, '']),
  projectId: Joi.string().empty([null, '']),
  scope: Joi.string().empty([null, '']),
  key: Joi.string().required(),
});

const postDatastoreSchema = Joi.object<{
  key: string;
  scope: 'user' | 'session' | 'global';
  data: any;
}>({
  key: Joi.string().required(),
  data: Joi.any(),
  scope: Joi.string().empty([null, '']),
});

const postParamsSchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  assistantId?: string;
  projectId?: string;
  reset: boolean;
}>({
  sessionId: Joi.string().empty([null, '']),
  assistantId: Joi.string().empty([null, '']),
  userId: Joi.string().empty([null, '']).required(),
  projectId: Joi.string().empty([null, '']).required(),
  reset: Joi.boolean().default(false),
});

const putParamsSchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  assistantId?: string;
  projectId?: string;
  key?: string;
  id?: string;
  scope?: string;
}>({
  id: Joi.string().allow('').empty([null, '']).optional(),
  key: Joi.string().allow('').empty([null, '']).optional(),
  userId: Joi.string().empty([null, '']),
  sessionId: Joi.string().empty([null, '']),
  assistantId: Joi.string().empty([null, '']),
  projectId: Joi.string().empty([null, '']),
  scope: Joi.string().empty([null, '']),
});

const getVariableSchema = Joi.object<{
  offset?: number;
  limit?: number;
  key: string;
  scope: string;
  projectId?: string;
  userId?: string;
  sessionId?: string;
  assistantId?: string;
}>({
  offset: Joi.number().integer().min(0).empty([null, '']).default(0).optional(),
  limit: Joi.number().integer().min(1).empty([null, '']).default(5).optional(),
  key: Joi.string().allow('').empty([null, '']).default(''),
  scope: Joi.string().valid('global', 'session', 'user').default('global').required(),
  userId: Joi.string().empty([null, '']),
  sessionId: Joi.string().empty([null, '']),
  assistantId: Joi.string().empty([null, '']),
  projectId: Joi.string().empty([null, '']),
});

router.get('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const {
    userId = '',
    sessionId = '',
    assistantId = '',
    projectId = '',
    key = '',
    scope = '',
  } = await getDatastoreSchema.validateAsync(req.query, { stripUnknown: true });

  const currentUserId = req.user?.did || userId || '';
  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  const params: { [key: string]: string } = {
    ...(currentUserId && { userId: currentUserId }),
    ...(sessionId && { sessionId }),
    ...(projectId && { projectId }),
    ...(assistantId && { assistantId }),
    ...(scope && { scope }),
    ...(key && { key }),
  };

  const datastores = await Datastore.findAll({ order: [['createdAt', 'ASC']], where: params });
  res.json(datastores);
});

router.post('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const { key, data, scope } = await postDatastoreSchema.validateAsync(req.body, { stripUnknown: true });
  const { userId, sessionId, assistantId, projectId, reset } = await postParamsSchema.validateAsync(req.query, {
    stripUnknown: true,
  });

  const currentUserId = req.user?.did || userId || '';
  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  if (reset) await Datastore.destroy({ where: { ...(scope && { scope }), ...(key && { key }) } });

  const datastore = await Datastore.create({
    key,
    scope,
    data,
    userId: currentUserId,
    sessionId,
    assistantId,
    projectId,
  });
  res.json(datastore);
});

router.put('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const {
    userId = '',
    sessionId = '',
    assistantId = '',
    projectId = '',
    key = '',
    id = '',
    scope = '',
  } = await putParamsSchema.validateAsync(req.query, { stripUnknown: true });

  const currentUserId = req.user?.did || userId || '';

  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  const params: { [key: string]: string } = {
    ...(currentUserId && { userId: currentUserId }),
    ...(sessionId && { sessionId }),
    ...(assistantId && { assistantId }),
    ...(projectId && { projectId }),
    ...(key && { key }),
    ...(scope && { scope }),
    ...(id && { id }),
  };

  const { data } = await Joi.object<{ data: any }>({ data: Joi.any() }).validateAsync(req.body, { stripUnknown: true });

  const dataItem = await Datastore.findOne({ where: params });
  if (!dataItem) {
    res.status(404).json({ error: 'No such datastore' });
    return;
  }

  const result = await dataItem.update({ data });
  res.json(result);
});

router.delete('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const {
    userId = '',
    sessionId = '',
    assistantId = '',
    projectId = '',
    scope = '',
    key = '',
    id = '',
  } = await putParamsSchema.validateAsync(req.query, { stripUnknown: true });

  const currentUserId = req.user?.did || userId || '';
  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  const params: { [key: string]: string } = {
    ...(currentUserId && { userId: currentUserId }),
    ...(sessionId && { sessionId }),
    ...(projectId && { projectId }),
    ...(assistantId && { assistantId }),
    ...(key && { key }),
    ...(scope && { scope }),
    ...(id && { id }),
  };

  try {
    await Datastore.destroy({ where: params });

    res.json({ data: 'success' });
  } catch (error) {
    console.error(error?.message);
    res.status(500).json({ error: error?.message });
  }
});

router.get('/variable-by-query', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const query = await getVariableSchema.validateAsync(req.query, { stripUnknown: true });
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
    const datastores = await Datastore.findAll({
      order: [['createdAt', 'ASC']],
      where: { ...params, scope, sessionId },
    });
    if (datastores.length) {
      return res.json(datastores);
    }
  }

  if (scope === 'session' || scope === 'user') {
    const datastores = await Datastore.findAll({
      order: [['createdAt', 'ASC']],
      where: { ...params, scope: 'user' },
    });
    if (datastores.length) {
      return res.json(datastores);
    }
  }

  if (scope === 'session' || scope === 'user' || scope === 'global') {
    const datastores = await Datastore.findAll({
      order: [['createdAt', 'ASC']],
      where: { ...params, scope: 'global' },
    });
    if (datastores.length) {
      return res.json(datastores);
    }
  }

  return res.json([]);
});

export default router;
