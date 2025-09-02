import { createWriteStream } from 'fs';
import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { finished } from 'stream/promises';

import { Config } from '@api/libs/env';
import { NoPermissionError, NotFoundError } from '@api/libs/error';
import logger from '@api/libs/logger';
import { resourceManager } from '@api/libs/resource';
import Segment from '@api/store/models/dataset/segment';
import { copyRecursive } from '@blocklet/ai-runtime/utils/fs';
import config from '@blocklet/sdk/lib/config';
import middlewares from '@blocklet/sdk/lib/middlewares';
import AuthService from '@blocklet/sdk/lib/service/blocklet';
import archiver from 'archiver';
import compression from 'compression';
import express, { Router } from 'express';
import { pathExists } from 'fs-extra';
import Joi from 'joi';
import { pick } from 'lodash';
import omitBy from 'lodash/omitBy';
import { Op, Sequelize } from 'sequelize';
import { stringify } from 'yaml';

import ensureKnowledgeDirExists, { getKnowledgeDir, getLogoPath } from '../../libs/ensure-dir';
import copyKnowledgeBase from '../../libs/knowledge';
import { ensureComponentCallOr, ensureComponentCallOrAdmin, userAuth } from '../../libs/security';
import Knowledge from '../../store/models/dataset/dataset';
import KnowledgeDocument from '../../store/models/dataset/document';
import { getResourceAvatarPath, sse } from './util';

const { initLocalStorageServer } = require('@blocklet/uploader-server');

const router = Router();
const authClient = new AuthService();

const knowledgeSchema = Joi.object<{
  name?: string;
  description?: string;
  projectId?: string;
  copyFromProjectId?: string;
  resourceBlockletDid?: string;
  knowledgeId?: string;
  icon?: string;
}>({
  name: Joi.string().allow('').empty(null).default(''),
  description: Joi.string().allow('').empty(null).default(''),
  projectId: Joi.string().allow('').empty(null).default(''),
  copyFromProjectId: Joi.string().allow('').empty(null).default(''),
  resourceBlockletDid: Joi.string().allow('').empty(null).default(''),
  knowledgeId: Joi.string().allow('').empty(null).default(''),
  icon: Joi.string().allow('').empty(null).default(''),
});

const knowledgeFromResourceSchema = Joi.object<{ items: (typeof knowledgeSchema.type)[] }>({
  items: Joi.array().items(knowledgeSchema).required(),
});

const getKnowledgeListQuerySchema = Joi.object<{ projectId?: string; page: number; size: number }>({
  projectId: Joi.string().empty(['', null]),
  page: Joi.number().integer().min(1).default(1),
  size: Joi.number().integer().min(1).max(10000).default(20),
});

router.get('/', middlewares.session(), ensureComponentCallOr(userAuth()), async (req, res) => {
  const query = await getKnowledgeListQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const documentsCountSql = Sequelize.literal(
    '(SELECT COUNT(*) FROM DatasetDocuments WHERE DatasetDocuments.knowledgeId = Dataset.id)'
  );

  const totalSizeSql = Sequelize.literal(
    '(SELECT COALESCE(SUM(size), 0) FROM DatasetDocuments WHERE DatasetDocuments.knowledgeId = Dataset.id)'
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
      const knowledge = item.dataValues;

      if (knowledge.resourceBlockletDid && knowledge.knowledgeId) {
        const resource = await resourceManager.getKnowledge({
          blockletDid: knowledge.resourceBlockletDid,
          knowledgeId: knowledge.knowledgeId,
        });

        // @ts-ignore
        knowledge.docs = resource?.documents.length;
        // @ts-ignore
        knowledge.totalSize = (resource?.documents || []).reduce((acc, i) => acc + i.size || 0, 0);

        knowledge.name = resource?.knowledge.name;
        knowledge.description = resource?.knowledge.description;

        return {
          ...knowledge,
          user: {
            did: resource?.did,
            fullName: resource?.title,
            avatar: getResourceAvatarPath(resource?.did!),
          },
          installed: !!resource,
        };
      }

      const { user } = await authClient.getUser(knowledge.updatedBy);
      return { ...knowledge, user: pick(user, ['did', 'fullName', 'avatar']), installed: true };
    })
  );

  res.json(knowledge);
});

const getResourceList = async () => {
  const resources = await resourceManager.getKnowledgeList();

  const list = await Promise.all(
    resources.map(async (item) => {
      return {
        ...(item?.knowledge || {}),
        user: {
          did: item?.did,
          fullName: item?.title,
          avatar: getResourceAvatarPath(item?.did!),
        },
        blockletDid: item.blockletDid,
        totalSize: 0,
        docs: item.documents?.length || 0,
      };
    })
  );

  return list;
};

router.get('/resources', middlewares.session(), ensureComponentCallOr(userAuth()), async (_req, res) => {
  const resources = await getResourceList();
  res.json(resources);
});

router.get('/:knowledgeId', middlewares.session(), ensureComponentCallOr(userAuth()), async (req, res) => {
  const { knowledgeId } = req.params;
  if (!knowledgeId) throw new Error('missing required param `knowledgeId`');

  const user =
    !req.user || req.user.isAdmin ? {} : { [Op.or]: [{ createdBy: req.user.did }, { updatedBy: req.user.did }] };

  const result = await Knowledge.findOneWithDocs({ where: { id: knowledgeId, ...user } });
  const knowledge = result?.dataValues;

  if (knowledge?.resourceBlockletDid && knowledge?.knowledgeId) {
    const resource = await resourceManager.getKnowledge({
      blockletDid: knowledge.resourceBlockletDid,
      knowledgeId: knowledge.knowledgeId,
    });

    // @ts-ignore
    knowledge.docs = resource?.documents.length;
    // @ts-ignore
    knowledge.totalSize = (resource?.documents || []).reduce((acc, i) => acc + i.size || 0, 0);

    knowledge.name = resource?.knowledge.name;
    knowledge.description = resource?.knowledge.description;
  }

  return res.json({ ...knowledge, user: pick(user, ['did', 'fullName', 'avatar']) });
});

export const exportResourceQuerySchema = Joi.object<{ public?: boolean }>({ public: Joi.boolean().empty(['', null]) });

router.get('/:knowledgeId/export-resource', middlewares.session(), ensureComponentCallOrAdmin(), async (req, res) => {
  // 以下为0.x.x 的存储方式,在使用时,可以比较好的，清楚之前的存储方式

  // try {
  //   // 首先将 projects documents contents 继续数据结构化
  //   await writeFile(
  //     join(knowledgeWithIdPath, 'knowledge.yaml'),
  //     stringify({ ...dataset.dataValues, public: query.public })
  //   );
  //   await writeFile(join(knowledgeWithIdPath, 'contents.yaml'), stringify(contents));

  //   // 复制 files 数据
  //   const uploadSrc = resolve(await getSourceFileDir(knowledgeId));
  //   const uploadsDst = join(knowledgeWithIdPath, 'uploads');

  //   if (await pathExists(uploadSrc)) {
  //     await copyRecursive(uploadSrc, uploadsDst);
  //   }

  //   await writeFile(join(knowledgeWithIdPath, 'documents.yaml'), stringify(documents));

  //   // 复制 vector db
  //   const src = resolve(await getVectorStorePath(knowledgeId));
  //   const vectorsDst = join(knowledgeWithIdPath, 'vectors');

  //   if (await pathExists(src)) {
  //     await copyRecursive(src, vectorsDst);
  //   }

  //   const zipPath = join(tmpFolder, `${knowledgeId}.zip`);
  //   const archive = archiver('zip');
  //   const stream = archive.pipe(createWriteStream(zipPath));

  //   archive.directory(knowledgeWithIdPath, false);

  //   await archive.finalize();
  //   await finished(stream);

  //   await new Promise<void>((resolve) => {
  //     res.sendFile(zipPath, (error) => {
  //       resolve();
  //       if (error) logger.error('sendFile error', error);
  //     });
  //   });
  // } finally {
  //   await rm(tmpFolder, { recursive: true, force: true });
  // }

  const { knowledgeId } = req.params;
  if (!knowledgeId) throw new Error('missing required param `knowledgeId`');

  const query = await exportResourceQuerySchema.validateAsync(req.query, { stripUnknown: true });

  const knowledge = await Knowledge.findByPk(knowledgeId, {
    rejectOnEmpty: new NotFoundError(`No such dataset ${knowledgeId}`),
  });
  const documents = await KnowledgeDocument.findAll({ where: { knowledgeId } });
  const segments = await Segment.findAll({ where: { documentId: { [Op.in]: documents.map((i) => i.id) } } });

  const tmpdir = join(Config.dataDir, 'tmp');
  await mkdir(tmpdir, { recursive: true });
  const tmpFolder = await mkdtemp(join(tmpdir, 'knowledge-pack-'));

  try {
    const knowledgeWithIdPath = join(tmpFolder, knowledgeId);
    await mkdir(knowledgeWithIdPath, { recursive: true });

    // 复制当前知识库文件夹
    const currentKnowledgeDir = await getKnowledgeDir(knowledgeId);
    if (await pathExists(currentKnowledgeDir)) {
      await copyRecursive(currentKnowledgeDir, knowledgeWithIdPath);
    }

    // 首先将 projects documents segments 继续数据结构化
    const knowledgeJSON = { ...knowledge.dataValues, public: query.public, version: '1.0.0' };
    await writeFile(join(knowledgeWithIdPath, 'knowledge.yaml'), stringify(knowledgeJSON));
    await writeFile(join(knowledgeWithIdPath, 'documents.yaml'), stringify(documents));
    await writeFile(join(knowledgeWithIdPath, 'segments.yaml'), stringify(segments));

    const zipPath = join(tmpFolder, `${knowledgeId}.zip`);
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
  if (!userId || typeof userId !== 'string') throw new NoPermissionError('Unauthorized');

  const { name, description, projectId, copyFromProjectId, knowledgeId, resourceBlockletDid } =
    await knowledgeSchema.validateAsync(req.body, { stripUnknown: true });

  if (projectId && copyFromProjectId) {
    const knowledge = await Knowledge.findAll({ where: { projectId: copyFromProjectId } });

    const map: { [oldKnowledgeBaseId: string]: string } = {};

    for (const oldKnowledge of knowledge) {
      const newKnowledgeId = await copyKnowledgeBase({
        oldKnowledgeBaseId: oldKnowledge.id,
        oldProjectId: copyFromProjectId,
        newProjectId: projectId,
        userId,
      });

      map[oldKnowledge.id] = newKnowledgeId;
    }

    const copied = Object.entries(map).map(([from, to]) => ({ from: { id: from }, to: { id: to } }));
    return res.json({ copied });
  }

  const params = omitBy({ name, description, projectId, knowledgeId, resourceBlockletDid }, (i) => i === undefined);
  const knowledge = await Knowledge.create({ ...params, createdBy: userId, updatedBy: userId });

  // 导入非资源知识库
  if (!resourceBlockletDid && !knowledgeId) {
    await ensureKnowledgeDirExists(knowledge.id);
  }

  return res.json(knowledge);
});

router.post('/import-resources', middlewares.session(), ensureComponentCallOr(userAuth()), async (req, res) => {
  const userId = req.user?.did;
  if (!userId || typeof userId !== 'string') throw new NoPermissionError('Unauthorized');

  const { items } = await knowledgeFromResourceSchema.validateAsync(req.body, { stripUnknown: true });

  const list = await Knowledge.bulkCreate(
    items.map((item) => {
      const params = omitBy(item, (i) => i === undefined);
      return { ...params, createdBy: userId, updatedBy: userId };
    })
  );

  return res.json(list);
});

router.put('/:knowledgeId', middlewares.session(), userAuth(), async (req, res) => {
  const { knowledgeId } = req.params;
  const { did } = req.user!;

  const knowledge = await Knowledge.findOne({ where: { id: knowledgeId } });
  if (!knowledge) {
    res.status(404).json({ error: 'No such knowledge' });
    return;
  }

  const { name, description, projectId, icon } = await knowledgeSchema.validateAsync(req.body, { stripUnknown: true });
  const params = omitBy({ name, description, projectId, icon }, (i) => !i);

  await Knowledge.update({ ...params, updatedBy: did }, { where: { id: knowledgeId } });

  res.json(await Knowledge.findOne({ where: { id: knowledgeId } }));
});

router.delete('/:knowledgeId', middlewares.session(), userAuth(), async (req, res) => {
  const { knowledgeId } = req.params;

  const knowledge = await Knowledge.findOne({ where: { [Op.or]: [{ id: knowledgeId }, { name: knowledgeId }] } });
  if (!knowledge) {
    res.status(404).json({ error: 'No such knowledge' });
    return;
  }

  await Promise.all([
    Knowledge.destroy({ where: { id: knowledgeId } }),
    KnowledgeDocument.destroy({ where: { knowledgeId } }),
  ]);

  res.json(knowledge);
});

router.get('/:knowledgeId/embeddings', compression(), sse.init);

const localStorageServer = initLocalStorageServer({
  path: Config.uploadDir,
  express,
  onUploadFinish: async (req: any, _res: any, uploadMetadata: any) => {
    const { knowledgeId } = req.query;
    const { hashFileName, absolutePath } = uploadMetadata.runtime;

    await copyFile(absolutePath, getLogoPath(knowledgeId));

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

  const knowledge = await Knowledge.findOne({ where: { id: knowledgeId } });

  if (knowledge) {
    if (knowledge.resourceBlockletDid && knowledge.knowledgeId) {
      const resource = await resourceManager.getKnowledge({
        blockletDid: knowledge.resourceBlockletDid,
        knowledgeId: knowledge.knowledgeId,
      });

      if (resource?.logoPath && (await pathExists(resource?.logoPath))) {
        res.setHeader('Content-Type', 'image/png');
        res.sendFile(resource?.logoPath);
        return;
      }
    } else if (knowledge?.icon) {
      const logoPath = getLogoPath(knowledgeId);

      if (await pathExists(logoPath)) {
        res.setHeader('Content-Type', 'image/png');
        res.sendFile(logoPath);
        return;
      }
    }
  }

  throw new NotFoundError(`No such knowledge Logo ${knowledgeId}`);
});

export default router;
