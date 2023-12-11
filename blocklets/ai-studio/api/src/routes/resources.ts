/* eslint-disable no-await-in-loop */
import fs from 'fs';
import path from 'path';

import component from '@blocklet/sdk/lib/component';
import { Router } from 'express';
import Joi from 'joi';
import uniqBy from 'lodash/uniqBy';
import { stringify } from 'yaml';

import { ensurePromptsEditor } from '../libs/security';
import { getTemplatesFromRepository } from '../store/0.1.157/projects';
import Projects from '../store/models/projects';
import { defaultBranch } from '../store/projects';

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

export function resourcesRoutes(router: Router) {
  router.get('/resources/export', ensurePromptsEditor, async (req, res) => {
    const projectRows = await Projects.findAll({
      order: [['updatedAt', 'DESC']],
    });
    const local = locales[(req.query as { local: string })?.local] || locales.zh;

    const resources = projectRows.map((x: any) => {
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
        resources.map(async (projectId) => getTemplatesFromRepository({ projectId, ref: defaultBranch }))
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
