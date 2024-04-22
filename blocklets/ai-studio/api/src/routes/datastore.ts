import Project from '@api/store/models/project';
import { isApiAssistant, isFunctionAssistant, isImageAssistant, isPromptAssistant } from '@blocklet/ai-runtime/types';
import user from '@blocklet/sdk/lib/middlewares/user';
import { Router } from 'express';
import Joi from 'joi';
import { countBy } from 'lodash';
import { Op, Sequelize } from 'sequelize';

import { ensureComponentCallOrAuth } from '../libs/security';
import Datastore from '../store/models/datastore';
import { getRepository } from '../store/repository';

const router = Router();

const getDatastoreSchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  assistantId?: string;
  projectId?: string;
  itemId?: string;
  key: string;
}>({
  userId: Joi.string().allow('').empty([null, '']),
  sessionId: Joi.string().allow('').empty([null, '']),
  assistantId: Joi.string().allow('').empty([null, '']),
  projectId: Joi.string().allow('').empty([null, '']),
  itemId: Joi.string().allow('').empty([null, '']),
  key: Joi.string().required(),
});

const postDatastoreSchema = Joi.object<{ key: string; itemId: string; data: any }>({
  key: Joi.string().required(),
  itemId: Joi.string().allow('').empty([null, '']).optional(),
  data: Joi.any(),
});

const postParamsSchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  assistantId?: string;
  projectId?: string;
  reset: boolean;
}>({
  userId: Joi.string().allow('').empty([null, '']),
  sessionId: Joi.string().allow('').empty([null, '']),
  assistantId: Joi.string().allow('').empty([null, '']),
  projectId: Joi.string().allow('').empty([null, '']),
  reset: Joi.boolean().default(false),
});

const putParamsSchema = Joi.object<{
  userId?: string;
  sessionId?: string;
  assistantId?: string;
  projectId?: string;
  itemId?: string;
  key?: string;
  id?: string;
}>({
  id: Joi.string().allow('').empty([null, '']).optional(),
  key: Joi.string().allow('').empty([null, '']).optional(),
  itemId: Joi.string().allow('').empty([null, '']),
  userId: Joi.string().allow('').empty([null, '']),
  sessionId: Joi.string().allow('').empty([null, '']),
  assistantId: Joi.string().allow('').empty([null, '']),
  projectId: Joi.string().allow('').empty([null, '']),
});

const getPageQuerySchema = Joi.object<{
  offset: number;
  limit?: number;
  projectId: string;
  scope: string;
}>({
  offset: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).empty(null).default(5),
  projectId: Joi.string().required(),
  scope: Joi.string().valid('global', 'session', 'local').default('global').required(),
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
  itemId?: string;
}>({
  offset: Joi.number().integer().min(0).empty([null, '']).default(0).optional(),
  limit: Joi.number().integer().min(1).empty([null, '']).default(5).optional(),
  key: Joi.string().allow('').empty([null, '']).default(''),
  scope: Joi.string().valid('global', 'session', 'local').default('global').required(),
  userId: Joi.string().allow('').empty([null, '']),
  sessionId: Joi.string().allow('').empty([null, '']),
  assistantId: Joi.string().allow('').empty([null, '']),
  projectId: Joi.string().allow('').empty([null, '']),
  itemId: Joi.string().allow('').empty([null, '']).default(''),
});

/**
 * @openapi
 * /api/datastore:
 *   get:
 *     summary: Get datastores
 *     description: Retrieve a list of datastores with optional query parameters to filter the results.
 *     x-summary-zh: 获取数据存储
 *     x-description-zh: 使用可选的查询参数检索数据存储列表以过滤结果。
 *     parameters:
 *       - in: query
 *         name: key
 *         description: key
 *         x-description-zh: 存储的名称
 *       - in: query
 *         name: itemId
 *         description: SubItem Id
 *         x-description-zh: 子项别名
 *     responses:
 *       200:
 *         description: A JSON array of datastores
 */
router.get('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const {
    userId = '',
    sessionId = '',
    assistantId = '',
    projectId = '',
    key = '',
    itemId = '',
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
    ...(itemId && { itemId }),
    ...(key && { key }),
  };

  const datastores = await Datastore.findAll({ order: [['createdAt', 'ASC']], where: params });
  res.json(datastores);
});

/**
 * @openapi
 * /api/datastore:
 *   post:
 *     summary: Set a new datastore
 *     description: Set a new datastore
 *     x-summary-zh: 设置数据存储
 *     x-description-zh: 设置数据存储
 *     parameters:
 *       - in: query
 *         name: reset
 *         schema:
 *           type: boolean
 *         required: false
 *         x-parameter-type: boolean
 *         description: Whether to overwrite old data
 *         x-description-zh: 是否覆盖旧数据
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *               - data
 *             properties:
 *               key:
 *                 type: string
 *                 description: key
 *                 x-description-zh: 别名
 *               itemId:
 *                 type: string
 *                 description: SubItem Id
 *                 x-description-zh: 子项别名
 *               data:
 *                 type: object
 *                 description: value
 *                 x-description-zh: 存储对象数据
 *     responses:
 *       200:
 *         description: The created datastore object
 */
router.post('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const { key, itemId, data } = await postDatastoreSchema.validateAsync(req.body, { stripUnknown: true });
  const { userId, sessionId, assistantId, projectId, reset } = await postParamsSchema.validateAsync(req.query, {
    stripUnknown: true,
  });

  const currentUserId = req.user?.did || userId || '';
  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  if (!itemId && !key) {
    throw new Error('Can not find `key` or `itemId` params');
  }

  if (reset) await Datastore.destroy({ where: { ...(itemId && { itemId }), ...(key && { key }) } });

  const datastore = await Datastore.create({
    key,
    itemId,
    data,
    userId: currentUserId,
    sessionId,
    assistantId,
    projectId,
  });
  res.json(datastore);
});

/**
 * @openapi
 * /api/datastore:
 *   put:
 *     summary: Update data
 *     description: Update data
 *     x-summary-zh: 更新数据存储
 *     x-description-zh: 更新数据存储的信息。
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: false
 *         description: ID
 *         x-description-zh: ID
 *       - in: query
 *         name: itemId
 *         description: SubItem Id
 *         x-description-zh: 子项别名
 *       - in: query
 *         name: key
 *         schema:
 *           type: string
 *         required: false
 *         description: key
 *         x-description-zh: 数据存储项别名
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: object
 *                 description: value
 *                 x-description-zh: 存储对象数据
 *     responses:
 *       200:
 *         description: The updated datastore object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The unique identifier for the datastore.
 *                 data:
 *                   type: object
 *                   description: The updated data of the datastore.
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   description: The creation date of the datastore.
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *                   description: The last update date of the datastore.
 *       404:
 *         description: No such datastore found
 */
router.put('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const {
    userId = '',
    sessionId = '',
    assistantId = '',
    projectId = '',
    itemId = '',
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
    ...(assistantId && { assistantId }),
    ...(projectId && { projectId }),
    ...(key && { key }),
    ...(itemId && { itemId }),
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

/**
 * @openapi
 * /api/datastore:
 *   delete:
 *     summary: Delete datastore data
 *     description: Delete datastore data
 *     x-summary-zh: 删除存储数据
 *     x-description-zh: 删除数据存储。
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: false
 *         description: ID
 *         x-description-zh: ID
 *       - in: query
 *         name: key
 *         schema:
 *           type: string
 *         required: false
 *         description: key
 *         x-description-zh: 数据存储项别名
 *       - in: query
 *         name: itemId
 *         description: SubItem Id
 *         x-description-zh: 子项别名
 *     responses:
 *       200:
 *         description: The deleted datastore object
 *       404:
 *         description: No such datastore found
 */
router.delete('/', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const {
    userId = '',
    sessionId = '',
    assistantId = '',
    projectId = '',
    itemId = '',
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
    ...(itemId && { itemId }),
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

const getAssistantParameters = async (projectId: string, scope: string) => {
  const project = await Project.findOne({ where: { _id: projectId } });

  const repo = await getRepository({ projectId });
  const working = await repo.working({ ref: project?.gitDefaultBranch! ?? 'main' });
  const keys = Object.keys(working.syncedStore.tree);

  const assistants = [];

  for (const key of keys) {
    const file = working.syncedStore.files[key];
    if (
      file &&
      (isPromptAssistant(file) || isApiAssistant(file) || isFunctionAssistant(file) || isImageAssistant(file)) &&
      file.parameters
    ) {
      assistants.push(Object.values(file?.parameters || {}).map((x) => x.data));
    }
  }

  const scopeAssistants = assistants.flatMap((x) => {
    return x.filter((x) => x.source && x.source.variableFrom === 'datastore' && x.source.scope?.scope === scope);
  });

  return scopeAssistants;
};

const getAssistantByKey = async (projectId: string, scope: string, inputKey: string) => {
  const project = await Project.findOne({ where: { _id: projectId } });

  const repo = await getRepository({ projectId });
  const working = await repo.working({ ref: project?.gitDefaultBranch! ?? 'main' });
  const keys = Object.keys(working.syncedStore.tree);

  const assistants = [];

  for (const key of keys) {
    const file = working.syncedStore.files[key];
    if (
      file &&
      (isPromptAssistant(file) || isApiAssistant(file) || isFunctionAssistant(file) || isImageAssistant(file)) &&
      file.parameters
    ) {
      const found = Object.values(file?.parameters || {})
        .map((x) => x.data)
        .filter((x) => x.source && x.source.variableFrom === 'datastore' && x.source.scope?.scope === scope)
        .find((x) => x.key === inputKey);

      if (found) {
        assistants.push({ id: file.id, key: inputKey, assistantId: file.id });
      }
    }
  }

  return assistants;
};

router.get('/all-variables', async (req, res) => {
  const { scope, offset, limit, projectId } = await getPageQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const params: {
    [key: string]: any;
  } = { projectId };

  const scopeAssistants = await getAssistantParameters(projectId, scope);

  if (scope === 'global') {
    params.sessionId = {
      [Op.or]: [{ [Op.is]: null }, { [Op.eq]: '' }],
    };
    params.assistantId = {
      [Op.or]: [{ [Op.is]: null }, { [Op.eq]: '' }],
    };
  }

  if (scope === 'session') {
    params.sessionId = {
      [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }],
    };
    params.assistantId = {
      [Op.or]: [{ [Op.is]: null }, { [Op.eq]: '' }],
    };
  }

  if (scope === 'local') {
    params.sessionId = {
      [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }],
    };
    params.assistantId = {
      [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }],
    };
  }

  if (!scopeAssistants.length) {
    return res.json({ list: [], count: 0 });
  }

  const parameters = scopeAssistants.map((x) => x.key!);
  params.key = { [Op.in]: parameters };

  const list = await Datastore.findAll({
    attributes: ['key', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
    group: ['key'],
    order: [['key', 'ASC']],
    offset,
    limit,
    where: params,
  });

  const parametersByCount = countBy(parameters);

  const count = await Datastore.count({ group: ['key'], where: params });
  return res.json({
    list: Object.entries(parametersByCount).map(([key, value]) => {
      return (
        list.find((x) => x.key === key)?.dataValues ?? {
          key,
          count: value ?? 0,
        }
      );
    }),
    count: count.length,
  });
});

router.get('/all-variable', async (req, res) => {
  const { key, projectId, scope, offset, limit } = await getVariableSchema.validateAsync(req.query, {
    stripUnknown: true,
  });

  const params: {
    [key: string]: any;
  } = { projectId, key };

  if (scope === 'global') {
    params.sessionId = {
      [Op.or]: [{ [Op.is]: null }, { [Op.eq]: '' }],
    };
    params.assistantId = {
      [Op.or]: [{ [Op.is]: null }, { [Op.eq]: '' }],
    };
  }

  if (scope === 'session') {
    params.sessionId = {
      [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }],
    };
    params.assistantId = {
      [Op.or]: [{ [Op.is]: null }, { [Op.eq]: '' }],
    };
  }

  if (scope === 'local') {
    params.sessionId = {
      [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }],
    };
    params.assistantId = {
      [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }],
    };
  }

  const list = await Datastore.findAll({ order: [['itemId', 'ASC']], offset, limit, where: params });
  const assistant = await getAssistantByKey(projectId || '', scope, key);
  res.json({ list: [...list.map((x) => x.dataValues), ...assistant] });
});

router.get('/variable-by-query', user(), ensureComponentCallOrAuth(), async (req, res) => {
  const query = await getVariableSchema.validateAsync(req.query, { stripUnknown: true });
  const { key, projectId, scope, assistantId, sessionId, itemId, userId } = query;

  const currentUserId = req.user?.did || userId || '';
  if (!currentUserId) {
    throw new Error('Can not get user info');
  }

  const params: { [key: string]: any } = {
    ...(currentUserId && { userId: currentUserId }),
    ...(projectId && { projectId }),
    ...(itemId && { itemId }),
    ...(key && { key }),
  };

  const datastores = await Datastore.findAll({ order: [['itemId', 'ASC']], where: params });

  // 如果是 'local' 先查找local 如果没有值，查找 session 如果还没有 查找  global, 最后给出默认值
  if (scope === 'local') {
    const filterAssistantDatastores = datastores.filter(
      (x) => x.sessionId === sessionId && x.assistantId === assistantId
    );
    if (filterAssistantDatastores.length) {
      return res.json(filterAssistantDatastores);
    }

    const filerSessionDatastores = datastores.filter((x) => x.sessionId === sessionId);
    if (filerSessionDatastores.length) {
      return res.json(filerSessionDatastores);
    }

    return res.json(datastores);
  }

  if (scope === 'session') {
    const filerSessionDatastores = datastores.filter((x) => x.sessionId === sessionId);
    if (filerSessionDatastores.length) {
      return res.json(filerSessionDatastores);
    }

    return res.json(datastores);
  }

  return res.json(datastores);
});

export default router;
