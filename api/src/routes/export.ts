/* eslint-disable no-await-in-loop */
import fs from 'fs';
import path from 'path';

import { Router } from 'express';
import Joi from 'joi';
import { parse, stringify } from 'yaml';

import env from '../libs/env';
import logger from '../libs/logger';
import { ensurePromptsEditor } from '../libs/security';
import { getRepository } from '../store/projects';
import { Template, getTemplate } from '../store/templates';

const templatesSchema = Joi.object({
  templates: Joi.array().items(Joi.string()).unique().required(),
});

const TARGET_DIR = 'ai.templates';

const getTemplateDir = () => {
  const templateDir = path.join(env.dataDir, TARGET_DIR);
  fs.mkdirSync(templateDir, { recursive: true });

  return templateDir;
};

export default function exportRoutes(router: Router) {
  router.post('/export/:projectId/:ref', ensurePromptsEditor, async (req, res) => {
    const { projectId, ref } = req.params;

    if (!projectId) throw new Error('Missing required params `projectId`');

    if (!ref) throw new Error('Missing required params `ref`');

    const input = await templatesSchema.validateAsync(req.body, { stripUnknown: true });

    const fns = input.templates.map(async (templateId: string) => {
      const repository = getRepository(projectId);
      return getTemplate({ repository, ref, templateId });
    });
    const templates: Template[] = await Promise.all(fns);
    const result = stringify({ templates });

    const templateDir = getTemplateDir();
    const templateFolder = fs.existsSync(templateDir);
    if (templateFolder) {
      fs.rmSync(templateDir, { force: true, recursive: true });
    }
    fs.mkdirSync(templateDir, { recursive: true });

    const templateFilename = path.join(templateDir, `templates-${Date.now()}.yaml`);
    await fs.promises.writeFile(templateFilename, result);

    res.json({ templates });
  });

  router.get('/export/file', ensurePromptsEditor, async (_req, res) => {
    // sdk 去 path projectId => ??
    const templateDir = getTemplateDir();
    const templateFolder = fs.existsSync(templateDir);

    let result = { templates: [], projectId: '', ref: '' };

    if (templateFolder) {
      const files = await fs.promises.readdir(templateDir).catch((e) => logger.error(e));

      if (files && files.length > 0) {
        const fns = files.map(async (filepath: string) => {
          const exportFile = path.join(templateDir, filepath);
          const data = await fs.promises.readFile(exportFile, 'utf8');
          const result = parse(data);
          return result;
        });
        const list = (await Promise.all(fns)).flat();

        const [{ templates }] = list;
        const { projectId, ref } = templates[0] || {};
        result = { templates, projectId, ref };
      }
    }

    return res.json(result);
  });
}
