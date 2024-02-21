import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import component from '@blocklet/sdk/lib/component';
import { Router } from 'express';
import Joi from 'joi';
import uniqBy from 'lodash/uniqBy';
import { stringify } from 'yaml';

import { ensurePromptsEditor } from '../libs/security';
import Project from '../store/models/project';
import { defaultBranch, getAssistantsOfRepository } from '../store/repository';

const AI_STUDIO_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

const TARGET_DIR = path.join(AI_STUDIO_DID, 'ai');

const getResourceDir = ({ projectId, releaseId }: { projectId: string; releaseId: string }) => {
  const exportDir = component.getResourceExportDir({ projectId, releaseId });
  const resourceDir = path.join(exportDir, TARGET_DIR);

  mkdirSync(resourceDir, { recursive: true });

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

    const resources = projects.map((x: any) => {
      return {
        id: x._id,
        name: x.name || locale?.unnamed,
        description: x.description,
      };
    });

    res.json({ resources });
  });

  router.post('/resources/export', ensurePromptsEditor, async (req, res) => {
    const { resources, projectId, releaseId } = await exportResourceSchema.validateAsync(req.body);

    const assistants = (
      await Promise.all(
        resources.map(async (projectId) => getAssistantsOfRepository({ projectId, ref: defaultBranch }))
      )
    ).flat();

    const result = stringify({ assistants: uniqBy(assistants, 'id') });

    const resourceDir = getResourceDir({ projectId, releaseId: releaseId || '' });
    mkdirSync(resourceDir, { recursive: true });

    const assistantsFilename = path.join(resourceDir, 'assistants.yaml');
    writeFileSync(assistantsFilename, result);

    return res.json(result);
  });
}
