/* eslint-disable no-await-in-loop */
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import downloadImage from '@api/libs/download-logo';
import logger from '@api/libs/logger';
import component from '@blocklet/sdk/lib/component';
import { Router } from 'express';
import Joi from 'joi';
import cloneDeep from 'lodash/cloneDeep';
import groupBy from 'lodash/groupBy';
import uniq from 'lodash/uniq';
import { stringify } from 'yaml';

import { ensurePromptsEditor } from '../libs/security';
import Project from '../store/models/project';
import { LOGO_FILENAME, defaultBranch, getAssistantsOfRepository, getRepository } from '../store/repository';

const AI_STUDIO_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';
const TARGET_DIR = path.join(AI_STUDIO_DID, 'ai');

const getResourceDir = async ({ projectId, releaseId }: { projectId: string; releaseId: string }) => {
  const exportDir = component.getResourceExportDir({ projectId, releaseId });
  const resourceDir = path.join(exportDir, TARGET_DIR);

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

const locales: { [key: string]: any } = {
  en: {
    unnamed: 'Unnamed',
  },
  zh: {
    unnamed: '未命名',
  },
};

export function resourceRoutes(router: Router) {
  router.get('/resources/export', ensurePromptsEditor, async (req, res) => {
    const projects = await Project.findAll({ order: [['updatedAt', 'DESC']] });

    const locale = locales[(req.query as { local: string })?.local] || locales.en;

    const list = projects.map((x: any) => {
      return { id: '', _id: x._id, name: x.name || locale?.unnamed, description: x.description };
    });

    const resources = [
      {
        id: 'template',
        name: '模板项目',
        children: cloneDeep(list).map((x) => {
          x.id = `template-${x._id}`;
          return x;
        }),
      },
      {
        id: 'example',
        name: '示例项目',
        children: cloneDeep(list).map((x) => {
          x.id = `example-${x._id}`;
          return x;
        }),
      },
    ];

    res.json({ resources });
  });

  router.post('/resources/export', ensurePromptsEditor, async (req, res) => {
    const { resources, projectId, releaseId } = await exportResourceSchema.validateAsync(req.body, {
      stripUnknown: true,
    });
    const splitResources = uniq(resources)
      .map((x) => {
        try {
          const [key, value] = x.split('-');
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

        // TODO 兼容老的 ai assistant, 晚些去掉
        await writeFile(path.join(folderPath, `${projectId}.yaml`), result);

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
