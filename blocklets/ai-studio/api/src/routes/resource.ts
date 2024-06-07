/* eslint-disable no-await-in-loop */
import { cp, lstat, mkdir, writeFile } from 'fs/promises';
import path from 'path';

import downloadImage from '@api/libs/download-logo';
import logger from '@api/libs/logger';
import { ResourceTypes } from '@api/libs/resource';
import { Assistant } from '@blocklet/ai-runtime/types';
import component from '@blocklet/sdk/lib/component';
import { Router } from 'express';
import { exists } from 'fs-extra';
import Joi from 'joi';
import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import { Op } from 'sequelize';
import { stringify } from 'yaml';

import { Config } from '../libs/env';
import { ensurePromptsEditor } from '../libs/security';
import Content from '../store/models/dataset/content';
import Knowledge from '../store/models/dataset/dataset';
import Document from '../store/models/dataset/document';
import Project from '../store/models/project';
import {
  LOGO_FILENAME,
  defaultBranch,
  getAssistantsOfRepository,
  getEntryFromRepository,
  getProjectConfig,
  getRepository,
  settingsFileSchema,
} from '../store/repository';

const AI_STUDIO_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

const getResourceDir = async ({ projectId, releaseId }: { projectId: string; releaseId: string }) => {
  const exportDir = component.getResourceExportDir({ projectId, releaseId });
  const resourceDir = path.join(exportDir, AI_STUDIO_DID);

  await mkdir(resourceDir, { recursive: true });

  return resourceDir;
};

const exportResourceSchema = Joi.object<{
  projectId: string;
  releaseId?: string;
  resources: string[];
  locale?: string;
}>({
  projectId: Joi.string().required().min(1),
  releaseId: Joi.string().allow(''),
  resources: Joi.array().items(Joi.string()).required(),
  locale: Joi.string().allow(''),
});

const locales: { [key in 'en' | 'zh']: { [key: string]: string } } = {
  en: {
    unnamed: 'Unnamed',
    example: 'Example',
    template: 'Template',
    application: 'Application',
    tool: 'Tool',
    'llm-adapter': 'LLM Adapter',
    'aigc-adapter': 'AIGC Adapter',
    knowledge: 'Knowledge',
    other: 'Other',
  },
  zh: {
    unnamed: '未命名',
    example: '示例',
    template: '模板',
    application: '应用',
    tool: '工具',
    'llm-adapter': 'LLM 适配器',
    'aigc-adapter': 'AIGC 适配器',
    knowledge: '知识库',
    other: '其它',
  },
};

export function resourceRoutes(router: Router) {
  const getExportedResourceQuerySchema = Joi.object<{ resourcesParams?: { projectId?: string }; locale?: string }>({
    locale: Joi.string().empty([null, '']),
    resourcesParams: Joi.object({
      projectId: Joi.string().empty([null, '']),
    }),
  });

  const tryParse = (s: any) => {
    try {
      return JSON.parse(s);
    } catch {
      // ignore
    }
    return undefined;
  };

  router.get('/resources/export', ensurePromptsEditor, async (req, res) => {
    const query = await getExportedResourceQuerySchema.validateAsync(
      {
        ...req.query,
        locale: req.query.locale || req.query.local,
        resourcesParams: tryParse(req.query.resourcesParams),
      },
      { stripUnknown: true }
    );

    const projects = await Project.findAll({
      where: query.resourcesParams?.projectId ? { id: query.resourcesParams.projectId } : {},
      order: [['updatedAt', 'DESC']],
    });

    const locale = locales[query.locale as keyof typeof locales] || locales.en;

    const knowledges = await Knowledge.findAll({});

    const resources = await Promise.all(
      projects.map(async (x) => {
        const assistants = await getAssistantsOfRepository({
          projectId: x.id,
          ref: x.gitDefaultBranch || defaultBranch,
        });
        const dependentComponents = getAssistantDependentComponents(assistants);

        const entry = await getEntryFromRepository({ projectId: x.id, ref: x.gitDefaultBranch || defaultBranch });

        return {
          id: x.id,
          name: x.name || locale.unnamed,
          description: x.description,
          children: [
            {
              id: `application/${x.id}`,
              name: locale.application,
              disabled: true,
              description: entry ? undefined : 'No such entry agent, You have to create an entry agent first',
              dependentComponents,
            },
            {
              id: `other/${x.id}`,
              name: locale.other,
              children: ResourceTypes.filter((i) => i !== 'application').map((type) => ({
                id: `${type}/${x.id}`,
                name: locale[type],
                children: ['tool', 'llm-adapter', 'aigc-adapter'].includes(type)
                  ? assistants.map((assistant) => ({
                      id: `${type}/${x.id}/${assistant.id}`,
                      name: assistant.name || locale.unnamed,
                      dependentComponents,
                    }))
                  : ['knowledge'].includes(type)
                    ? knowledges.map((knowledge) => ({
                        id: `${type}/${x.id}/${knowledge.id}`,
                        name: knowledge.name || locale.unnamed,
                      }))
                    : undefined,
                dependentComponents,
              })),
            },
          ].filter(Boolean),
        };
      })
    );

    res.json({ resources: resources.length === 1 ? resources[0]!.children : resources });
  });

  router.post('/resources/export', ensurePromptsEditor, async (req, res) => {
    const { resources, projectId, releaseId } = await exportResourceSchema.validateAsync(req.body, {
      stripUnknown: true,
    });

    const resourceTypes = Object.entries(
      groupBy(
        uniq(resources)
          .map((x) => {
            // 如果是知识库  agentId 代表 knowledgeId
            const [type, projectId, agentId] = x.split('/');
            return ResourceTypes.includes(type as any) && projectId
              ? {
                  type,
                  projectId,
                  agentId: type === 'knowledge' ? undefined : agentId,
                  knowledgeId: type === 'knowledge' ? agentId : undefined,
                }
              : null;
          })
          .filter((i): i is NonNullable<typeof i> => !!i),
        (i) => i.type
      )
    );

    const resourceDir = await getResourceDir({ projectId, releaseId: releaseId || '' });
    const arr = [];

    const knowledgeIds: string[] = [];
    for (const [type, value] of resourceTypes) {
      const folderPath = path.join(resourceDir, type);
      if (type === 'knowledge') {
        continue;
      }

      const projects = groupBy(value, (v) => v.projectId);

      for (const [projectId, values] of Object.entries(projects)) {
        const repository = await getRepository({ projectId });
        const agentIds = new Set(values.map((i) => i.agentId).filter((i): i is string => !!i));

        if (type === 'application') {
          const project = await Project.findByPk(projectId, {
            rejectOnEmpty: new Error(`No such project ${projectId}`),
          });
          const entry = await getEntryFromRepository({ projectId, ref: project.gitDefaultBranch! });
          if (!entry) throw new Error(`Missing entry agent for project ${projectId}`);
        }

        await mkdir(path.join(folderPath, projectId), { recursive: true });

        const project = await Project.findOne({
          where: { id: projectId },
          rejectOnEmpty: new Error(`no such project ${projectId}`),
        });
        const assistants = await Promise.all(
          (await getAssistantsOfRepository({ projectId, ref: project.gitDefaultBranch || defaultBranch })).map(
            async (i) => {
              const logo = i.release?.logo;

              const logoFilename = `${i.id}-release-logo.png`;
              const logoPath = path.join(folderPath, projectId, logoFilename);

              try {
                if (logo) {
                  await downloadImage(logo, logoPath);
                }
              } catch (error) {
                logger.error('failed to download assistant logo', { error, logo });
              }

              return {
                ...i,
                // NOTE: 是否是公开的 agent，公开的 agent 可以被选择引用
                public: agentIds.has(i.id) || undefined,
                release: {
                  ...i.release,
                  logo: logoFilename,
                },
              };
            }
          )
        );

        const config = await getProjectConfig({ repository, ref: project?.gitDefaultBranch || defaultBranch }).catch(
          (error) => {
            logger.error('failed to get project config', { error });
          }
        );

        // 判断是否有知识库的引用
        for (const assistant of assistants) {
          if (assistant.parameters?.length) {
            (assistant.parameters || []).forEach((parameter) => {
              if (parameter.type === 'source' && parameter.source?.variableFrom === 'knowledge') {
                if (parameter.source.knowledge?.id) knowledgeIds.push(parameter.source.knowledge.id);
              }
            });
          }
        }

        const result = stringify({
          assistants,
          project: await settingsFileSchema.validateAsync(project.dataValues),
          config,
        });

        // 新的保存方式，可以存储更多内容
        await writeFile(path.join(folderPath, projectId, `${projectId}.yaml`), result);

        // 写入logo.png
        const resourceLogoPath = path.join(folderPath, projectId, LOGO_FILENAME);

        try {
          const icon = await repository.readBlob({
            ref: project?.gitDefaultBranch || defaultBranch,
            filepath: LOGO_FILENAME,
          });
          await writeFile(resourceLogoPath, icon.blob);
        } catch (error) {
          logger.error('failed to save icon file to resource dir', { error });
        }

        arr.push(result);
      }
    }

    // 合并选择的知识库和使用的知识库
    const selectKnowledge = resourceTypes.find(([type]) => type === 'knowledge');
    const uniqueKnowledgeIds = Array.from(new Set(knowledgeIds));

    const formatSelectKnowledge = [
      ...(selectKnowledge
        ? (selectKnowledge[1] || [])
            .filter((x) => x.knowledgeId)
            .map((x) => x.knowledgeId)
            .filter((i): i is NonNullable<typeof i> => !!i)
        : []),
    ].map((i) => ({ id: i, private: false }));
    const formatDependentKnowledge = uniqueKnowledgeIds.map((i) => ({ id: i, private: true }));
    const allKnowledge = [...formatSelectKnowledge, ...formatDependentKnowledge];

    if (allKnowledge.length > 0) {
      const folderPath = path.join(resourceDir, 'knowledge');
      if (!(await exists(folderPath))) {
        await mkdir(folderPath, { recursive: true });
      }

      await getKnowledgeList(folderPath, allKnowledge);
    }

    return res.json(arr);
  });
}

function getAssistantDependentComponents(assistant: Assistant | Assistant[]) {
  return [
    ...new Set(
      [assistant].flat().flatMap((assistant) => {
        if (!assistant.parameters) return [];
        const inputDeps = Object.values(assistant.parameters).flatMap((i) => {
          if (i.type === 'source' && i.source?.variableFrom === 'tool') {
            const did = i.source.agent?.blockletDid;
            return did ? [did] : [];
          }

          if (i.type === 'source' && i.source?.variableFrom === 'knowledge') {
            const did = i.source.knowledge?.blockletDid;
            return did ? [did] : [];
          }

          return [];
        });

        const executorDeps = assistant.executor?.agent?.blockletDid ? [assistant.executor?.agent?.blockletDid] : [];

        const appearanceDeps =
          assistant.outputVariables
            ?.map((i) => i.appearance?.componentBlockletDid)
            .filter((i): i is NonNullable<typeof i> => !!i) ?? [];

        return [...inputDeps, ...executorDeps, ...appearanceDeps];
      })
    ),
  ];
}

const getKnowledgeList = async (folderPath: string, knowledges: { id: string; private: boolean }[]) => {
  for (const item of knowledges) {
    await getKnowledgeInfo(folderPath, item);
  }
};

const getKnowledgeInfo = async (knowledgePath: string, item: { id: string; private: boolean }) => {
  const knowledgeId = item.id;
  const knowledge = await Knowledge.findOne({ where: { id: knowledgeId } });
  if (!knowledge) return;

  const documents = await Document.findAll({ where: { datasetId: knowledgeId, type: { [Op.ne]: 'discussKit' } } });
  const documentIds = documents.map((i) => i.id);
  const contents = await Content.findAll({ where: { documentId: { [Op.in]: documentIds } } });

  const knowledgeWithIdPath = path.join(knowledgePath, knowledgeId);
  if (!(await exists(knowledgeWithIdPath))) {
    await mkdir(knowledgeWithIdPath, { recursive: true });
  }

  // 首先将 projects documents contents 继续数据结构化
  await writeFile(
    path.join(knowledgeWithIdPath, 'knowledges.yaml'),
    stringify({ ...knowledge.dataValues, private: item.private })
  );
  await writeFile(path.join(knowledgeWithIdPath, 'contents.yaml'), stringify(contents));
  logger.info(`write ${knowledgeId} knowledges, contents db success`);

  // 复制 files 数据
  try {
    const uploadsPath = path.join(knowledgeWithIdPath, 'uploads');
    if (!(await exists(uploadsPath))) {
      await mkdir(uploadsPath, { recursive: true });
    }

    const hasPath = (data: any): data is { type: string; path: string } => {
      return typeof data === 'object' && data !== null && 'path' in data;
    };
    const filterDocuments = documents.filter((i) => hasPath(i.data));

    for (const document of filterDocuments) {
      if (hasPath(document.data)) {
        const newPath = path.join(uploadsPath, path.basename(document.data.path));
        await cp(document.data.path, newPath, {
          recursive: true,
          filter: async (src) => {
            const stats = await lstat(src);
            return !stats.isSymbolicLink();
          },
        });

        // 特别注意，需要将 path 路径更换到新的路径, 在使用时，拼接 uploadsPath
        document.data.path = path.basename(document.data.path);
      }
    }
    logger.info(`copy ${knowledgeId} upload files success`);

    await writeFile(path.join(knowledgeWithIdPath, 'documents.yaml'), stringify(documents));
    logger.info(`write ${knowledgeId} documents db success`);
  } catch (error) {
    logger.error('An error occurred:', error);
  }

  // 复制项链数据库
  try {
    const vectorsPath = path.join(knowledgeWithIdPath, 'vectors', knowledgeId);
    if (!(await exists(vectorsPath))) {
      await mkdir(vectorsPath, { recursive: true });
    }

    const vectorDir = path.resolve(Config.dataDir, 'vectors', knowledgeId);
    if (await exists(vectorDir)) {
      await cp(vectorDir, vectorsPath, { recursive: true });
      logger.info(`copy ${knowledgeId} vectors db success`);
    }
  } catch (error) {
    logger.error('An error occurred:', error);
  }
};
