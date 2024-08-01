import { createWriteStream } from 'fs';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { basename, join, resolve } from 'path';
import { finished } from 'stream/promises';

import { Config } from '@api/libs/env';
import logger from '@api/libs/logger';
import { resourceManager } from '@api/libs/resource';
import DatasetContent from '@api/store/models/dataset/content';
import { copyRecursive } from '@blocklet/ai-runtime/utils/fs';
import config from '@blocklet/sdk/lib/config';
import user from '@blocklet/sdk/lib/middlewares/user';
import archiver from 'archiver';
import compression from 'compression';
import { Router } from 'express';
import { exists } from 'fs-extra';
import Joi from 'joi';
import omitBy from 'lodash/omitBy';
import { Op, Sequelize } from 'sequelize';
import { stringify } from 'yaml';

import { ensureComponentCallOr, ensureComponentCallOrAdmin, userAuth } from '../../libs/security';
import Dataset from '../../store/models/dataset/dataset';
import DatasetDocument from '../../store/models/dataset/document';
import { sse } from './embeddings';

const router = Router();

const datasetSchema = Joi.object<{ name?: string; description?: string; appId?: string }>({
  name: Joi.string().allow('').empty(null).default(''),
  description: Joi.string().allow('').empty(null).default(''),
  appId: Joi.string().allow('').empty(null).default(''),
});

const getDatasetsQuerySchema = Joi.object<{ excludeResource?: boolean; projectId?: string }>({
  excludeResource: Joi.boolean().empty(['', null]),
  projectId: Joi.string().empty(['', null]),
});

router.get('/', user(), ensureComponentCallOr(userAuth()), async (req, res) => {
  const query = await getDatasetsQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const sql = Sequelize.literal(
    '(SELECT COUNT(*) FROM DatasetDocuments WHERE DatasetDocuments.datasetId = Dataset.id)'
  );

  const datasets = await Dataset.findAll({
    where: omitBy(
      {
        appId: query.projectId,
        // 多租户模式下，只能查看自己创建的知识库
        createdBy: req.user && config.env.tenantMode === 'multiple' ? req.user.did : undefined,
      },
      (i) => i === undefined
    ),
    attributes: { include: [[sql, 'documents']] },
    order: [['updatedAt', 'DESC']],
  });

  const resourceDatasets = query.excludeResource ? [] : await resourceManager.getKnowledgeList();

  res.json([
    ...datasets,
    ...resourceDatasets.map((i) => ({
      ...i.knowledge,
      blockletDid: i.blockletDid,
      documents: (i.documents || []).length,
    })),
  ]);
});

router.get('/:datasetId', user(), ensureComponentCallOr(userAuth()), async (req, res) => {
  const { datasetId } = req.params;
  if (!datasetId) throw new Error('missing required param `datasetId`');

  const user =
    !req.user || req.user.isAdmin ? {} : { [Op.or]: [{ createdBy: req.user.did }, { updatedBy: req.user.did }] };

  const { blockletDid, appId } = await Joi.object<{ blockletDid?: string; appId?: string }>({
    blockletDid: Joi.string().empty(['', null]),
    appId: Joi.string().allow('').empty(null).default(''),
  }).validateAsync(req.query, { stripUnknown: true });

  const dataset = blockletDid
    ? (await resourceManager.getKnowledge({ blockletDid, knowledgeId: datasetId }))?.knowledge
    : await Dataset.findOne({ where: { id: datasetId, ...(appId && { appId }), ...user } });

  res.json(dataset);
});

export const exportResourceQuerySchema = Joi.object<{ public?: boolean }>({
  public: Joi.boolean().empty(['', null]),
});

router.get('/:datasetId/export-resource', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const { datasetId } = req.params;
  if (!datasetId) throw new Error('missing required param `datasetId`');

  const query = await exportResourceQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const dataset = await Dataset.findByPk(datasetId, { rejectOnEmpty: new Error(`No such dataset ${datasetId}`) });

  const documents = await DatasetDocument.findAll({ where: { datasetId, type: { [Op.ne]: 'discussKit' } } });
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
    const uploadsPath = join(knowledgeWithIdPath, 'uploads');
    await mkdir(uploadsPath, { recursive: true });

    const hasPath = (data: any): data is { type: string; path: string } => {
      return typeof data === 'object' && 'path' in data;
    };
    const filterDocuments = documents.filter((i) => hasPath(i.data));

    for (const document of filterDocuments) {
      if (hasPath(document.data)) {
        const newPath = join(uploadsPath, basename(document.data.path));
        await copyFile(document.data.path, newPath);

        // 特别注意，需要将 path 路径更换到新的路径, 在使用时，拼接 uploadsPath
        document.data.path = basename(document.data.path);
      }
    }

    await writeFile(join(knowledgeWithIdPath, 'documents.yaml'), stringify(documents));

    // 复制 vector db
    const dst = join(knowledgeWithIdPath, 'vectors', datasetId);
    const src = resolve(Config.dataDir, 'vectors', datasetId);
    if (await exists(src)) {
      copyRecursive(src, dst);
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

router.post('/', user(), userAuth(), async (req, res) => {
  const { did } = req.user!;
  const { name = '', description = '', appId } = await datasetSchema.validateAsync(req.body, { stripUnknown: true });

  const dataset = await Dataset.create({ name, description, appId, createdBy: did, updatedBy: did });
  res.json(dataset);
});

router.put('/:datasetId', user(), userAuth(), async (req, res) => {
  const { datasetId } = req.params;
  const { did } = req.user!;

  const dataset = await Dataset.findOne({ where: { id: datasetId } });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  const { name, description, appId } = await datasetSchema.validateAsync(req.body, { stripUnknown: true });
  const params: any = {};
  if (name) params.name = name;
  if (description) params.description = description;
  if (appId) params.appId = appId;

  await Dataset.update({ ...params, updatedBy: did }, { where: { id: datasetId } });

  res.json(await Dataset.findOne({ where: { id: datasetId } }));
});

router.delete('/:datasetId', user(), userAuth(), async (req, res) => {
  const { datasetId } = req.params;

  const dataset = await Dataset.findOne({ where: { [Op.or]: [{ id: datasetId }, { name: datasetId }] } });
  if (!dataset) {
    res.status(404).json({ error: 'No such dataset' });
    return;
  }

  await Promise.all([Dataset.destroy({ where: { id: datasetId } }), DatasetDocument.destroy({ where: { datasetId } })]);

  res.json(dataset);
});

router.get('/:datasetId/embeddings', compression(), sse.init);

export default router;
