/* eslint-disable no-await-in-loop */
import fs from 'fs';
import path from 'path';

import component from '@blocklet/sdk/lib/component';
import { Router } from 'express';
import Joi from 'joi';
import uniqBy from 'lodash/uniqBy';
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

const separator = '/';

const getDeepTemplate = async (projectId: string, templateId: string) => {
  let templates: Template[] = [];

  try {
    const repository = await getRepository({ projectId });
    const template = await getTemplate({ repository, ref: defaultBranch, templateId });

    templates = [template];

    if (template.next?.id) {
      const nextTemplate = await getDeepTemplate(projectId, template.next?.id);
      if (nextTemplate?.length) {
        templates = [...templates, ...nextTemplate];
      }
    }

    if (template.branch?.branches?.length) {
      for (const branch of template.branch?.branches || []) {
        if (branch.template?.id) {
          const branchTemplate = await getDeepTemplate(projectId, branch.template?.id);
          if (branchTemplate?.length) {
            templates = [...templates, ...branchTemplate];
          }
        }
      }
    }
  } catch (error) {
    // return templates
  }

  return templates;
};

export function resourcesRoutes(router: Router) {
  router.get('/resources/export', ensurePromptsEditor, async (_req, res) => {
    const projectIds = (await projects.cursor().sort({ createdAt: 1 }).exec()).map((i) => i._id!);

    const templates = (
      await Promise.all(
        projectIds.map(async (projectId) => getTemplatesFromRepository({ projectId, ref: defaultBranch }))
      )
    )
      .flat()
      .filter((x) => x.public);

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
      const list = await getDeepTemplate(projectId, templateId);
      return list;
    });

    const templates = (await Promise.all(fns)).flat();
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
