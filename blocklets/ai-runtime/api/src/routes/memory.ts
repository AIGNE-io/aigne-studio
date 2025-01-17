import { ensureComponentCallOrAdmin } from '@api/libs/security';
import middlewares from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import isNil from 'lodash/isNil';
import omitBy from 'lodash/omitBy';

import Memory from '../store/models/memory';

const router = Router();

const getMemoriesQuerySchema = Joi.object<{
  sessionId?: string;
  projectId: string;
  scope: string;
  key: string;
}>({
  sessionId: Joi.string().empty([null, '']),
  projectId: Joi.string().required(),
  scope: Joi.string().required(),
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
  sessionId?: string;
  projectId: string;
  reset: boolean;
}>({
  sessionId: Joi.string().empty([null, '']),
  projectId: Joi.string().required(),
  reset: Joi.boolean().default(false),
});

const updateMemoryQuerySchema = Joi.object<{
  sessionId?: string;
  agentId?: string;
  projectId?: string;
  key?: string;
  id?: string;
  scope?: string;
}>({
  id: Joi.string().allow('').empty([null, '']).optional(),
  key: Joi.string().allow('').empty([null, '']).optional(),
  sessionId: Joi.string().allow('').empty([null, '']).optional(),
  agentId: Joi.string().allow('').empty([null, '']).optional(),
  projectId: Joi.string().allow('').empty([null, '']).optional(),
  scope: Joi.string().allow('').empty([null, '']).optional(),
});

router.get('/', middlewares.session({ componentCall: true }), ensureComponentCallOrAdmin(), async (req, res) => {
  const userId = req.user?.method === 'componentCall' ? req.query.userId : req.user?.did;

  const { sessionId, projectId, key, scope } = await getMemoriesQuerySchema.validateAsync(req.query, {
    stripUnknown: true,
  });

  const datastores = await Memory.findAll({
    order: [['createdAt', 'ASC']],
    where: omitBy({ sessionId, projectId, scope, userId, key }, (v) => isNil(v)),
  });

  res.json(datastores);
});

router.post('/', middlewares.session({ componentCall: true }), ensureComponentCallOrAdmin(), async (req, res) => {
  const userId = req.user?.method === 'componentCall' ? req.query.userId : req.user?.did;

  const { key, data, scope } = await createMemoryInputSchema.validateAsync(req.body, { stripUnknown: true });
  const { sessionId, projectId, reset } = await createMemoryQuerySchema.validateAsync(req.query, {
    stripUnknown: true,
  });

  if (reset) await Memory.destroy({ where: omitBy({ projectId, sessionId, scope, key }, (v) => isNil(v)) });

  const datastore = await Memory.create({ key, scope, data, userId: (userId as string) || '', sessionId, projectId });

  res.json(datastore);
});

router.put('/', middlewares.session({ componentCall: true }), ensureComponentCallOrAdmin(), async (req, res) => {
  const userId = req.user?.method === 'componentCall' ? req.query.userId : req.user?.did;
  if (!userId || typeof userId !== 'string') throw new Error('Can not get user info');

  const { sessionId, agentId, projectId, key, id, scope } = await updateMemoryQuerySchema.validateAsync(req.query, {
    stripUnknown: true,
  });

  const params = omitBy({ sessionId, agentId, projectId, id, scope, key }, (v) => isNil(v));
  const { data } = await Joi.object<{ data: any }>({ data: Joi.any() }).validateAsync(req.body, { stripUnknown: true });

  const dataItem = await Memory.findOne({ where: params });
  if (!dataItem) {
    res.status(404).json({ error: 'No such datastore' });
    return;
  }

  const result = await dataItem.update({ data });
  res.json(result);
});

router.delete('/', middlewares.session({ componentCall: true }), ensureComponentCallOrAdmin(), async (req, res) => {
  const userId = req.user?.method === 'componentCall' ? req.query.userId : req.user?.did;
  if (!userId || typeof userId !== 'string') throw new Error('Can not get user info');

  const { sessionId, agentId, projectId, scope, key, id } = await updateMemoryQuerySchema.validateAsync(req.query, {
    stripUnknown: true,
  });

  const params = omitBy({ sessionId, agentId, projectId, id, scope, key }, (v) => isNil(v));

  try {
    await Memory.destroy({ where: params });

    res.json({ data: 'success' });
  } catch (error) {
    res.status(500).json({ error: error?.message });
  }
});

const getMemoryQuerySchema = Joi.object<{
  key: string;
  scope: string;
  projectId?: string;
  sessionId?: string;
}>({
  key: Joi.string().allow('').empty([null, '']).default(''),
  scope: Joi.string().valid('global', 'session', 'user').default('global').required(),
  sessionId: Joi.string().allow('').empty([null, '']).optional(),
  projectId: Joi.string().allow('').empty([null, '']).optional(),
});

router.get(
  '/variable-by-query',
  middlewares.session({ componentCall: true }),
  ensureComponentCallOrAdmin(),
  async (req, res) => {
    const query = await getMemoryQuerySchema.validateAsync(req.query, { stripUnknown: true });
    const { key, projectId, scope, sessionId } = query;

    const userId = req.user?.method === 'componentCall' ? req.query.userId : req.user?.did;

    const params: { [key: string]: any } = omitBy({ userId, projectId, key }, (v) => isNil(v));

    if (scope === 'session') {
      const datastores = await Memory.findAll({
        order: [['createdAt', 'ASC']],
        where: { ...params, scope: 'session', sessionId },
      });

      if (datastores.length) {
        return res.json({ datastores });
      }
    }

    if (scope === 'session' || scope === 'user') {
      const datastores = await Memory.findAll({
        order: [['createdAt', 'ASC']],
        where: { ...params, scope: 'user', ...(userId ? {} : { sessionId }) },
      });

      if (datastores.length) {
        return res.json({ datastores });
      }
    }

    if (scope === 'session' || scope === 'user' || scope === 'global') {
      const datastores = await Memory.findAll({
        order: [['createdAt', 'ASC']],
        where: { ...params, scope: 'global', ...(userId ? {} : { sessionId }) },
      });

      if (datastores.length) {
        return res.json({ datastores });
      }
    }

    return res.json({ datastores: [] });
  }
);

const getMemoryByKeyQuerySchema = Joi.object<{ projectId: string; key: string }>({
  projectId: Joi.string().required(),
  key: Joi.string().required(),
});

router.get('/by-key', async (req, res) => {
  const { projectId, key } = await getMemoryByKeyQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const memories = await Memory.findAll({
    order: [['createdAt', 'ASC']],
    where: { projectId, key },
  });

  return res.json({ memories });
});

export default router;
