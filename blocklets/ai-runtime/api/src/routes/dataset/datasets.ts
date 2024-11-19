import { createWriteStream } from 'fs';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { finished } from 'stream/promises';

import { Config } from '@api/libs/env';
import { NotFoundError } from '@api/libs/error';
import logger from '@api/libs/logger';
import { resourceManager } from '@api/libs/resource';
import DatasetContent from '@api/store/models/dataset/content';
import { copyRecursive } from '@blocklet/ai-runtime/utils/fs';
import config from '@blocklet/sdk/lib/config';
import middlewares from '@blocklet/sdk/lib/middlewares';
import AuthService from '@blocklet/sdk/lib/service/auth';
// @ts-ignore
import { initLocalStorageServer } from '@blocklet/uploader-server';
import archiver from 'archiver';
import compression from 'compression';
import express, { Router } from 'express';
import { exists, pathExists } from 'fs-extra';
import Joi from 'joi';
import { pick } from 'lodash';
import omitBy from 'lodash/omitBy';
import { Op, Sequelize } from 'sequelize';
import { joinURL } from 'ufo';
import { stringify } from 'yaml';

import ensureKnowledgeDirExists, { getUploadDir, getVectorStorePath } from '../../libs/ensure-dir';
import copyKnowledgeBase from '../../libs/knowledge';
import { ensureComponentCallOr, ensureComponentCallOrAdmin, userAuth } from '../../libs/security';
import Knowledge from '../../store/models/dataset/dataset';
import KnowledgeDocument from '../../store/models/dataset/document';
import { sse } from './embeddings';

const router = Router();
const authClient = new AuthService();

const datasetSchema = Joi.object<{
  name?: string;
  description?: string;
  projectId?: string;
  copyFromProjectId?: string;
  resourceBlockletDid?: string;
  knowledgeId?: string;
}>({
  name: Joi.string().allow('').empty(null).default(''),
  description: Joi.string().allow('').empty(null).default(''),
  projectId: Joi.string().allow('').empty(null).default(''),
  copyFromProjectId: Joi.string().allow('').empty(null).default(''),
  resourceBlockletDid: Joi.string().allow('').empty(null).default(''),
  knowledgeId: Joi.string().allow('').empty(null).default(''),
});

const knowledgeFromResourceSchema = Joi.object<{ items: (typeof datasetSchema.type)[] }>({
  items: Joi.array().items(datasetSchema).required(),
});

const getKnowledgeListQuerySchema = Joi.object<{ projectId?: string; page: number; size: number }>({
  projectId: Joi.string().empty(['', null]),
  page: Joi.number().integer().min(1).default(1),
  size: Joi.number().integer().min(1).max(100).default(20),
});

router.get('/', middlewares.session(), ensureComponentCallOr(userAuth()), async (req, res) => {
  const query = await getKnowledgeListQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const documentsCountSql = Sequelize.literal(
    '(SELECT COUNT(*) FROM DatasetDocuments WHERE DatasetDocuments.datasetId = Dataset.id)'
  );

  const totalSizeSql = Sequelize.literal(
    '(SELECT COALESCE(SUM(size), 0) FROM DatasetDocuments WHERE DatasetDocuments.datasetId = Dataset.id)'
  );

  const params = omitBy(
    {
      projectId: query.projectId,
      createdBy: req.user && config.env.tenantMode === 'multiple' ? req.user.did : undefined, // 多租户模式下，只能查看自己创建的知识库
    },
    (i) => i === undefined
  );

  const items = await Knowledge.findAll({
    where: params,
    attributes: {
      include: [
        [documentsCountSql, 'docs'],
        [totalSizeSql, 'totalSize'],
      ],
    },
    order: [['updatedAt', 'DESC']],
    offset: (query.page - 1) * query.size,
    limit: query.size,
  });

  const knowledge = await Promise.all(
    items.map(async (item) => {
      const { user } = await authClient.getUser(item.updatedBy);
      return { ...item.dataValues, user: pick(user, ['did', 'fullName', 'avatar']) };
    })
  );

  res.json(knowledge);
});

router.get('/resources', middlewares.session(), ensureComponentCallOr(userAuth()), async (_req, res) => {
  const resources = await resourceManager.getKnowledgeList();

  const knowledge = await Promise.all(
    resources.map(async (item) => {
      const { user } = item?.knowledge ? await authClient.getUser(item?.knowledge.updatedBy) : { user: {} };
      return {
        ...(item?.knowledge || {}),
        user: pick(user, ['did', 'fullName', 'avatar']),
        blockletDid: item.blockletDid,
        totalSize: 0,
        docs: item.documents?.length || 0,
      };
    })
  );

  res.json(knowledge);
});

router.get('/:knowledgeId', middlewares.session(), ensureComponentCallOr(userAuth()), async (req, res) => {
  const { knowledgeId } = req.params;
  if (!knowledgeId) throw new Error('missing required param `knowledgeId`');

  const user =
    !req.user || req.user.isAdmin ? {} : { [Op.or]: [{ createdBy: req.user.did }, { updatedBy: req.user.did }] };

  const knowledge = await Knowledge.findOneWithDocs({ where: { id: knowledgeId, ...user } });

  if (knowledge?.resourceBlockletDid && knowledge?.knowledgeId) {
    const item = await resourceManager.getKnowledge({
      blockletDid: knowledge.resourceBlockletDid,
      knowledgeId: knowledge.knowledgeId,
    });

    return res.json({
      ...(item?.knowledge || {}),
      user: pick(user, ['did', 'fullName', 'avatar']),
      blockletDid: item?.blockletDid,
      totalSize: 0,
      docs: item?.documents?.length || 0,
    });
  }

  return res.json(knowledge);
});

export const exportResourceQuerySchema = Joi.object<{ public?: boolean }>({
  public: Joi.boolean().empty(['', null]),
});

router.get('/:datasetId/export-resource', middlewares.session(), ensureComponentCallOrAdmin(), async (req, res) => {
  const { datasetId } = req.params;
  if (!datasetId) throw new Error('missing required param `datasetId`');

  const query = await exportResourceQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const dataset = await Knowledge.findByPk(datasetId, { rejectOnEmpty: new Error(`No such dataset ${datasetId}`) });
  const documents = await KnowledgeDocument.findAll({ where: { datasetId, type: { [Op.ne]: 'discussKit' } } });
  const documentIds = documents.map((i) => i.id);
  const contents = await DatasetContent.findAll({ where: { documentId: { [Op.in]: documentIds } } });

  const tmpdir = join(Config.dataDir, 'tmp');
  await mkdir(tmpdir, { recursive: true });
  const tmpFolder = await mkdtemp(join(tmpdir, 'knowledge-pack-'));
  try {
    const knowledgeWithIdPath = join(tmpFolder, datasetId);
    await mkdir(knowledgeWithIdPath, { recursive: true });

    // 首先将 projects documents contents 继续数据结构化
    await writeFile(
      join(knowledgeWithIdPath, 'knowledge.yaml'),
      stringify({ ...dataset.dataValues, public: query.public })
    );
    await writeFile(join(knowledgeWithIdPath, 'contents.yaml'), stringify(contents));

    // 复制 files 数据
    const uploadSrc = resolve(await getUploadDir(datasetId));
    const uploadsDst = join(knowledgeWithIdPath, 'uploads');

    if (await pathExists(uploadSrc)) {
      await copyRecursive(uploadSrc, uploadsDst);
    }

    await writeFile(join(knowledgeWithIdPath, 'documents.yaml'), stringify(documents));

    // 复制 vector db
    const src = resolve(await getVectorStorePath(datasetId));
    const vectorsDst = join(knowledgeWithIdPath, 'vectors');

    if (await pathExists(src)) {
      await copyRecursive(src, vectorsDst);
    }

    const zipPath = join(tmpFolder, `${datasetId}.zip`);
    const archive = archiver('zip');
    const stream = archive.pipe(createWriteStream(zipPath));

    archive.directory(knowledgeWithIdPath, false);

    await archive.finalize();
    await finished(stream);

    await new Promise<void>((resolve) => {
      res.sendFile(zipPath, (error) => {
        resolve();
        if (error) logger.error('sendFile error', error);
      });
    });
  } finally {
    await rm(tmpFolder, { recursive: true, force: true });
  }
});

router.post('/', middlewares.session({ componentCall: true }), ensureComponentCallOr(userAuth()), async (req, res) => {
  const userId = req.user?.method === 'componentCall' ? req.query.userId : req.user?.did;
  if (!userId || typeof userId !== 'string') throw new Error('Unauthorized');

  const { name, description, projectId, copyFromProjectId, knowledgeId, resourceBlockletDid } =
    await datasetSchema.validateAsync(req.body, { stripUnknown: true });

  if (projectId && copyFromProjectId) {
    const knowledge = await Knowledge.findAll({ where: { projectId: copyFromProjectId } });

    const map: { [oldKnowledgeBaseId: string]: string } = {};

    for (const item of knowledge) {
      const newKnowledgeId = await copyKnowledgeBase({
        oldKnowledgeBaseId: item.id,
        oldProjectId: copyFromProjectId,
        newProjectId: projectId,
        userId,
      });

      map[item.id] = newKnowledgeId;
    }

    const copied = Object.entries(map).map(([from, to]) => ({ from: { id: from }, to: { id: to } }));
    return res.json({ copied });
  }

  const params = omitBy({ name, description, projectId, knowledgeId, resourceBlockletDid }, (i) => i === undefined);
  const dataset = await Knowledge.create({
    ...params,
    createdBy: userId,
    updatedBy: userId,
  });

  if (!resourceBlockletDid && !knowledgeId) {
    await ensureKnowledgeDirExists(dataset.id);
  }

  return res.json(dataset);
});

router.post('/knowledge-from-resources', middlewares.session(), ensureComponentCallOr(userAuth()), async (req, res) => {
  const userId = req.user?.did;
  if (!userId || typeof userId !== 'string') throw new Error('Unauthorized');

  const { items } = await knowledgeFromResourceSchema.validateAsync(req.body, { stripUnknown: true });

  const dataset = await Knowledge.bulkCreate(
    items.map((item) => {
      const params = omitBy(item, (i) => i === undefined);
      return { ...params, createdBy: userId, updatedBy: userId };
    })
  );

  return res.json(dataset);
});

router.put('/:datasetId', middlewares.session(), userAuth(), async (req, res) => {
  const { datasetId } = req.params;
  const { did } = req.user!;

  const dataset = await Knowledge.findOne({ where: { id: datasetId } });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  const { name, description, projectId } = await datasetSchema.validateAsync(req.body, { stripUnknown: true });
  const params: any = {};
  if (name) params.name = name;
  if (description) params.description = description;
  if (projectId) params.projectId = projectId;

  await Knowledge.update({ ...params, updatedBy: did }, { where: { id: datasetId } });

  res.json(await Knowledge.findOne({ where: { id: datasetId } }));
});

router.delete('/:datasetId', middlewares.session(), userAuth(), async (req, res) => {
  const { datasetId } = req.params;

  const dataset = await Knowledge.findOne({ where: { [Op.or]: [{ id: datasetId }, { name: datasetId }] } });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  await Promise.all([
    Knowledge.destroy({ where: { id: datasetId } }),
    KnowledgeDocument.destroy({ where: { datasetId } }),
  ]);

  res.json(dataset);
});

router.get('/:datasetId/embeddings', compression(), sse.init);

const localStorageServer = initLocalStorageServer({
  path: Config.uploadDir,
  express,
  onUploadFinish: async (req: any, _res: any, uploadMetadata: any) => {
    const { knowledgeId } = req.query;
    const { hashFileName, absolutePath } = uploadMetadata.runtime;
    const newFilePath = joinURL(getUploadDir(knowledgeId), hashFileName);

    await copyFile(absolutePath, newFilePath);

    // 延迟文件移动操作
    setTimeout(async () => {
      await rm(absolutePath, { recursive: true, force: true });
    }, 3000);

    await Knowledge.update({ icon: hashFileName }, { where: { id: knowledgeId } });

    return uploadMetadata;
  },
});

router.use('/upload-icon', middlewares.session(), localStorageServer.handle);

router.get('/:knowledgeId/icon.png', async (req, res) => {
  const { knowledgeId } = req.params;
  if (!knowledgeId) throw new Error('Missing required parameter `knowledgeId`');

  const original = await Knowledge.findOne({ where: { id: knowledgeId } });
  if (original?.icon) {
    const logoPath = joinURL(getUploadDir(knowledgeId), original.icon);

    if (await exists(logoPath)) {
      res.setHeader('Content-Type', 'image/png');
      res.sendFile(logoPath);
      return;
    }
  }

  throw new NotFoundError(`No such knowledge ${knowledgeId}`);
});
export default router;
