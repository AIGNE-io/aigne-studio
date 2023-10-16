/* eslint-disable no-await-in-loop */
import fs from 'fs';
import path from 'path';

import component from '@blocklet/sdk/lib/component';
import { Router } from 'express';
import Joi from 'joi';
import { stringify } from 'yaml';

import { ensurePromptsEditor } from '../libs/security';
import { defaultBranch, getRepository, getTemplatesFromRepository, projects } from '../store/projects';
import { Template, getTemplate } from '../store/templates';

const TARGET_DIR = 'ai.templates';

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

const separator = '&&&';

export function resourcesRoutes(router: Router) {
  router.get('/resources/export', ensurePromptsEditor, async (_req, res) => {
    const projectIds = (await projects.cursor().sort({ createdAt: 1 }).exec()).map((i) => i._id!);

    const templates = (
      await Promise.all(
        projectIds.map(async (projectId) => getTemplatesFromRepository({ projectId, ref: defaultBranch }))
      )
    )
      .flat()
      .filter((x) => x.status === 'public');

    const resources = templates.map((x: any) => {
      return {
        id: `${x.projectId}${separator}${x.id}`,
        name: x.name,
        description: x.description,
      };
    });

    res.json({ resources });
  });
  router.post('/resources/export', ensurePromptsEditor, async (req, res) => {
    const { resources, projectId, releaseId } = await exportResourceSchema.validateAsync(req.body);

    const fns = resources.map(async (_id: string) => {
      const [projectId = '', templateId = ''] = _id.split(separator);
      const repository = await getRepository({ projectId });
      return getTemplate({ repository, ref: defaultBranch, templateId });
    });

    const templates: Template[] = await Promise.all(fns);
    const result = stringify({ templates });

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
