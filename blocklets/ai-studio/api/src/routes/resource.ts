import { copyFile, mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';

import { Config } from '@api/libs/env';
import logger from '@api/libs/logger';
import { ResourceTypes } from '@api/libs/resource';
import { AIGNE_RUNTIME_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { Assistant, projectSettingsSchema } from '@blocklet/ai-runtime/types';
import { copyRecursive } from '@blocklet/ai-runtime/utils/fs';
import component, { call } from '@blocklet/sdk/lib/component';
import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import { pathExists } from 'fs-extra';
import Joi from 'joi';
import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import { joinURL } from 'ufo';
import { Extract } from 'unzipper';
import { stringify } from 'yaml';

import { ensurePromptsEditor } from '../libs/security';
import Knowledge from '../store/models/dataset/dataset';
import Project from '../store/models/project';
import {
  ASSETS_DIR,
  LOGO_FILENAME,
  defaultBranch,
  getAssistantsOfRepository,
  getEntryFromRepository,
  getProjectConfig,
  getProjectMemoryVariables,
  getRepository,
} from '../store/repository';

const AI_STUDIO_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

const getResourceDir = async ({ projectId, releaseId }: { projectId: string; releaseId: string }) => {
  const exportDir = component.getResourceExportDir({ projectId, releaseId });
  const resourceDir = join(exportDir, AI_STUDIO_DID);

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
  const getExportedResourceQuerySchema = Joi.object<{
    resourcesParams?: { projectId?: string; hideOthers?: boolean };
    locale?: string;
  }>({
    locale: Joi.string().empty([null, '']),
    resourcesParams: Joi.object({
      projectId: Joi.string().empty([null, '']),
      hideOthers: Joi.boolean().empty([null, '']),
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

  router.get('/resources/export', user(), ensurePromptsEditor, async (req, res) => {
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

    const kbList = (
      await call<Knowledge[]>({
        name: AIGNE_RUNTIME_COMPONENT_DID,
        method: 'get',
        path: '/api/datasets',
        params: { excludeResource: true },
        headers: { 'x-user-did': req.user?.did },
      })
    ).data;

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
              disabled: !entry,
              description: entry ? undefined : 'No such entry agent, You have to create an entry agent first',
              dependentComponents,
            },
            !query.resourcesParams?.hideOthers && {
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
                    ? kbList.map((knowledge) => ({
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

    const referencedKBIds: string[] = [];
    for (const [type, value] of resourceTypes) {
      const folderPath = join(resourceDir, type);
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
          const entry = await getEntryFromRepository({ projectId, ref: project.gitDefaultBranch || defaultBranch });
          if (!entry) throw new Error(`Missing entry agent for project ${projectId}`);
        }

        await mkdir(join(folderPath, projectId), { recursive: true });

        const project = await Project.findOne({
          where: { id: projectId },
          rejectOnEmpty: new Error(`no such project ${projectId}`),
        });

        const assistants = await Promise.all(
          (await getAssistantsOfRepository({ projectId, ref: project.gitDefaultBranch || defaultBranch })).map(
            async (i) => {
              return {
                ...i,
                // NOTE: 是否是公开的 agent，公开的 agent 可以被选择引用
                public: agentIds.has(i.id) || undefined,
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
              if (
                parameter.type === 'source' &&
                parameter.source?.variableFrom === 'knowledge' &&
                // 忽略引用 resource blocklet 中的知识库，会作为 blocklet components 依赖
                parameter.source.knowledge?.id &&
                !parameter.source.knowledge?.blockletDid
              ) {
                referencedKBIds.push(parameter.source.knowledge.id);
              }
            });
          }
        }

        const data = {
          assistants,
          project: await projectSettingsSchema.validateAsync(project.dataValues),
          config,
          memory: {
            variables: (
              await getProjectMemoryVariables({
                repository,
                ref: project.gitDefaultBranch || defaultBranch,
              })
            )?.variables,
          },
        };

        const tmpdir = join(Config.appDir, 'tmp');
        await mkdir(tmpdir, { recursive: true });
        const workingCopy = await mkdtemp(join(tmpdir, 'publish-working-'));
        try {
          await repository.checkout({ dir: workingCopy, force: true, ref: project.gitDefaultBranch || defaultBranch });

          const result = stringify(data);
          await writeFile(join(folderPath, projectId, `${projectId}.yaml`), result);

          const assetsSrc = join(workingCopy, ASSETS_DIR, '/');
          const assetsDir = join(folderPath, projectId, 'assets/');
          await mkdir(assetsDir, { recursive: true });
          if (await pathExists(assetsSrc)) {
            await copyRecursive(assetsSrc, assetsDir);
          }

          const resourceLogoPath = join(folderPath, projectId, LOGO_FILENAME);
          await copyFile(join(workingCopy, LOGO_FILENAME), resourceLogoPath);

          arr.push(result);
        } finally {
          await rm(workingCopy, { recursive: true, force: true });
        }
      }
    }

    // 合并选择的知识库和使用的知识库
    const selectedKBIds =
      resourceTypes
        .find(([type]) => type === 'knowledge')?.[1]
        .map((i) => i.knowledgeId)
        .filter((i): i is NonNullable<typeof i> => !!i) ?? [];

    const kbList = [...new Set([...selectedKBIds, ...referencedKBIds])].map((i) => ({
      id: i,
      public: selectedKBIds.includes(i),
    }));

    if (kbList.length > 0) {
      const folderPath = join(resourceDir, 'knowledge');
      await mkdir(folderPath, { recursive: true });
      await exportKnowledgeList(folderPath, kbList);
    }

    // generate partial blocklet.yml
    const blockletYml: any = {
      capabilities: {
        navigation: false,
      },
    };

    if (resourceTypes.some((i) => i[0] === 'application')) {
      blockletYml.engine = {
        interpreter: 'blocklet',
        source: {
          store: Config.createResourceBlockletEngineStore,
          name: AIGNE_RUNTIME_COMPONENT_DID,
          version: 'latest',
        },
      };
    }

    const releaseDir = component.getReleaseExportDir({ projectId, releaseId });
    await writeFile(join(releaseDir, 'blocklet.yml'), stringify(blockletYml));

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

        const outputVariables = (assistant.outputVariables ?? []).filter((i) => !i.hidden);
        const appearanceDeps =
          outputVariables
            .map((i) => i.appearance?.componentBlockletDid)
            .filter((i): i is NonNullable<typeof i> => !!i) ?? [];

        return [...inputDeps, ...executorDeps, ...appearanceDeps];
      })
    ),
  ];
}

const exportKnowledgeList = async (path: string, list: { id: string; public: boolean }[]) => {
  for (const item of list) {
    await exportKnowledgeInfo(path, item);
  }
};

const exportKnowledgeInfo = async (folder: string, item: { id: string; public: boolean }) => {
  const knowledgeId = item.id;

  const knowledgeWithIdPath = join(folder, knowledgeId);
  await mkdir(knowledgeWithIdPath, { recursive: true });

  const res = await call({
    name: AIGNE_RUNTIME_COMPONENT_DID,
    method: 'get',
    path: joinURL('/api/datasets', knowledgeId, 'export-resource'),
    params: { public: item.public },
    responseType: 'stream',
  });

  await res.data.pipe(Extract({ path: knowledgeWithIdPath }), { end: true }).promise();
};
