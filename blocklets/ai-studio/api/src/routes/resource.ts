/* eslint-disable no-await-in-loop */
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import downloadImage from '@api/libs/download-logo';
import logger from '@api/libs/logger';
import { ResourceTypes } from '@api/libs/resource';
import { Assistant } from '@blocklet/ai-runtime/types';
import component from '@blocklet/sdk/lib/component';
import { Router } from 'express';
import Joi from 'joi';
import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import { stringify } from 'yaml';

import { ensurePromptsEditor } from '../libs/security';
import Project from '../store/models/project';
import { LOGO_FILENAME, defaultBranch, getAssistantsOfRepository, getRepository } from '../store/repository';

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
      where: query.resourcesParams?.projectId ? { _id: query.resourcesParams.projectId } : {},
      order: [['updatedAt', 'DESC']],
    });

    const locale = locales[query.locale as keyof typeof locales] || locales.en;

    const resources = await Promise.all(
      projects.map(async (x) => {
        const dependentComponents = getAssistantDependentComponents(
          await getAssistantsOfRepository({ projectId: x._id, ref: x.gitDefaultBranch! })
        );

        return {
          id: x._id,
          name: x.name || locale.unnamed,
          description: x.description,
          children: [
            {
              id: `application/${x._id}`,
              name: locale.application,
              dependentComponents,
            },
            {
              id: `other/${x._id}`,
              name: locale.other,
              children: ResourceTypes.filter((i) => i !== 'application').map((i) => ({
                id: `${i}/${x._id}`,
                name: locale[i],
                dependentComponents,
              })),
            },
          ],
        };
      })
    );

    res.json({ resources: resources.length === 1 ? resources[0]!.children : resources });
  });

  router.post('/resources/export', ensurePromptsEditor, async (req, res) => {
    const { resources, projectId, releaseId } = await exportResourceSchema.validateAsync(req.body, {
      stripUnknown: true,
    });
    const splitResources = uniq(resources)
      .map((x) => {
        try {
          const [key, value] = x.split('/');
          if (key && value) return { key, value };
          return null;
        } catch (error) {
          return null;
        }
      })
      .filter((i): i is NonNullable<typeof i> => !!i);
    const groupResources = groupBy(splitResources, 'key');

    const formatResources = Object.entries(groupResources).map(([key, value]) => ({
      key,
      value: uniq(value.map((x) => x.value).filter(Boolean)).filter(Boolean),
    }));

    const resourceDir = await getResourceDir({ projectId, releaseId: releaseId || '' });
    const arr = [];

    for (const item of formatResources) {
      const { key, value } = item;

      const folderPath = path.join(resourceDir, key);

      for (const projectId of value) {
        await mkdir(path.join(folderPath, projectId), { recursive: true });

        const project = await Project.findOne({ where: { _id: projectId } });
        const assistants = await Promise.all(
          (await getAssistantsOfRepository({ projectId, ref: project?.gitDefaultBranch! })).map(async (i) => {
            const logo = i.release?.logo;
            if (!logo) return i;

            const logoFilename = `${i.id}-release-logo.png`;
            const logoPath = path.join(folderPath, projectId, logoFilename);

            try {
              await downloadImage(logo, logoPath);
            } catch (error) {
              logger.error('failed to download assistant logo', { error, logo });
            }

            return { ...i, release: { ...i.release, logo: logoFilename } };
          })
        );

        const result = stringify({ assistants, project: project && project.dataValues });

        // 新的保存方式，可以存储更多内容
        await writeFile(path.join(folderPath, projectId, `${projectId}.yaml`), result);

        // 写入logo.png
        const repository = await getRepository({ projectId });
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
