/* eslint-disable no-await-in-loop */
import fs from 'fs';
import path from 'path';

import component from '@blocklet/sdk/lib/component';
import { Router } from 'express';
import Joi from 'joi';
import uniqBy from 'lodash/uniqBy';
import { stringify } from 'yaml';

import { ensurePromptsEditor } from '../libs/security';
import Project from '../store/models/project';
import { defaultBranch, getAssistantsOfRepository } from '../store/repository';

const TARGET_DIR = 'templates.ai';

const getTemplateDir = ({ projectId, releaseId }: { projectId: string; releaseId: string }) => {
  const exportDir = component.getResourceExportDir({ projectId, releaseId });
  const templateDir = path.join(exportDir, TARGET_DIR);
  if (!fs.existsSync(templateDir)) {
    fs.mkdirSync(templateDir, { recursive: true });
  }

  return templateDir;
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
    const projects = await Project.findAll({
      order: [['updatedAt', 'DESC']],
    });

    const local = locales[(req.query as { local: string })?.local] || locales.en;

    const resources = projects.map((x: any) => {
      return {
        id: x._id,
        name: x.name || local?.unnamed,
        description: x.description,
      };
    });

    res.json({ resources });
  });

  router.post('/resources/export', ensurePromptsEditor, async (req, res) => {
    const { resources, projectId, releaseId } = await exportResourceSchema.validateAsync(req.body);

    const templates = (
      await Promise.all(
        resources.map(async (projectId) => getAssistantsOfRepository({ projectId, ref: defaultBranch }))
      )
    ).flat();

    const result = stringify({ templates: uniqBy(templates, 'id') });

    const templateDir = getTemplateDir({ projectId, releaseId: releaseId || '' });
    const templateFolder = fs.existsSync(templateDir);
    if (templateFolder) {
      fs.rmSync(templateDir, { force: true, recursive: true });
    }
    fs.mkdirSync(templateDir, { recursive: true });

    const templateFilename = path.join(templateDir, `templates-${Date.now()}.yaml`);
    await fs.promises.writeFile(templateFilename, result);

    return res.json(result);
  });
}
