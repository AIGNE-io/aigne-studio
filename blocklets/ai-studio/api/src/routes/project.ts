import { cpSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';

import { call } from '@blocklet/sdk/lib/component';
import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import { uniqBy } from 'lodash';
import omit from 'lodash/omit';
import omitBy from 'lodash/omitBy';
import sample from 'lodash/sample';
import { nanoid } from 'nanoid';
import { Op } from 'sequelize';

import { defaultModel } from '../libs/models';
import { ensureComponentCallOrAdmin, ensureComponentCallOrPromptsEditor } from '../libs/security';
import { createImageUrl } from '../libs/utils';
import Projects from '../store/models/projects';
import {
  defaultBranch,
  getRepository,
  nextProjectId,
  projectTemplates,
  repositoryRoot,
  templateToYjs,
} from '../store/projects';
import { Template, getTemplate, nextTemplateId } from '../store/templates';

let icons: { filename: string }[] = [];

export interface CreateProjectInput {
  duplicateFrom?: string;
  templateId?: string;
  name?: string;
  description?: string;
}

const createProjectSchema = Joi.object<CreateProjectInput>({
  duplicateFrom: Joi.string().empty([null, '']),
  templateId: Joi.string().empty([null, '']),
  name: Joi.string().empty([null, '']),
  description: Joi.string().empty([null, '']),
});

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  pinned?: boolean;
  icon?: string;
  model?: string;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  gitType?: string;
}

const updateProjectSchema = Joi.object<UpdateProjectInput>({
  name: Joi.string().empty([null, '']),
  description: Joi.string().empty([null, '']),
  pinned: Joi.boolean().empty([null]),
  icon: Joi.string().allow('').empty([null, '']),
  model: Joi.string().empty([null, '']),
  temperature: Joi.number().min(0).max(2).empty(null),
  topP: Joi.number().min(0.1).max(1).empty(null),
  presencePenalty: Joi.number().min(-2).max(2).empty(null),
  frequencyPenalty: Joi.number().min(-2).max(2).empty(null),
  maxTokens: Joi.number().integer().empty(null),
  gitType: Joi.string().valid('simple', 'default').empty([null, '']),
});

export interface GetProjectsQuery {
  type?: 'templates';
}

const getProjectsQuerySchema = Joi.object<GetProjectsQuery>({
  type: Joi.string().allow('templates').empty([null, '']),
});

const getDeepTemplate = async (projectId: string, ref: string, templateId: string) => {
  let templates: (Template & { parent?: string[] })[] = [];

  try {
    const repository = await getRepository({ projectId });
    const filepath = await repository.findFile(templateId, { ref });

    const template = (await getTemplate({ repository, ref, templateId })) as Template & { parent?: string[] };
    template.parent = filepath.split('/').slice(0, -1);

    templates = [template];

    if (template.next?.id) {
      const nextTemplate = await getDeepTemplate(projectId, ref, template.next?.id);
      if (nextTemplate?.length) {
        templates = [...templates, ...nextTemplate];
      }
    }

    if (template.branch?.branches?.length) {
      for (const branch of template.branch?.branches || []) {
        if (branch.template?.id) {
          const branchTemplate = await getDeepTemplate(projectId, ref, branch.template?.id);
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

const exportImportSchema = Joi.object<{
  projectId: string;
  ref: string;
  resources: string[];
}>({
  projectId: Joi.string().required().min(1),
  ref: Joi.string(),
  resources: Joi.array().items(Joi.string()).required(),
});

export function projectRoutes(router: Router) {
  router.get('/projects', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { type } = await getProjectsQuerySchema.validateAsync(req.query, { stripUnknown: true });

    if (type === 'templates') {
      res.json({ projects: projectTemplates });
      return;
    }

    const list = await Projects.findAll({
      order: [
        ['pinnedAt', 'DESC'],
        ['updatedAt', 'DESC'],
      ],
    });

    res.json({ projects: list });
  });

  router.get('/projects/icons', ensureComponentCallOrPromptsEditor(), async (_req, res) => {
    const { data } = await call({
      name: 'image-bin',
      path: '/api/sdk/uploads',
      method: 'GET',
      params: { pageSize: 100, tags: 'default-project-icon' },
    });

    res.json({ icons: data?.uploads || [] });
  });

  router.get('/projects/:projectId', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;

    const project = await Projects.findOne({ where: { _id: projectId } });
    if (!project) {
      res.status(404).json({ error: 'No such project' });
      return;
    }

    res.json(project);
  });

  router.post('/projects', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { duplicateFrom, templateId, name } = await createProjectSchema.validateAsync(req.body, {
      stripUnknown: true,
    });
    const { did, fullName } = req.user!;

    if (duplicateFrom) {
      const original = await Projects.findOne({ where: { _id: duplicateFrom } });
      if (!original) throw new Error(`Project ${duplicateFrom} not found`);

      const repo = await getRepository({ projectId: original._id! });

      const project = await Projects.create({
        ...original.dataValues,
        model: original.model || defaultModel,
        _id: nextProjectId(),
        name: original.name && `${original.name}-copy`,
        createdBy: did,
        updatedBy: did,
      });

      const parent = dirname(repo.root);
      cpSync(repo.root, join(parent, project._id!), { recursive: true });
      if (existsSync(`${repo.root}.cooperative`)) {
        cpSync(`${repo.root}.cooperative`, join(parent, `${project._id}.cooperative`), { recursive: true });
      }
      res.json(project);
      return;
    }

    if (templateId) {
      const template = projectTemplates.find((i) => i._id === templateId);
      if (!template) throw new Error(`Template project ${templateId} not found`);

      let icon = '';

      if (!icons.length) {
        try {
          const { data } = await call({
            name: 'image-bin',
            path: '/api/sdk/uploads',
            method: 'GET',
            params: { pageSize: 100, tags: 'default-project-icon' },
          });

          icons = data?.uploads || [];
        } catch (error) {
          // error
        }
      }

      const item = sample(icons);
      if (item?.filename) {
        icon = createImageUrl(`${req.protocol}://${req.host}`, item.filename);
      }

      const project = await Projects.create({
        ...omit(template, 'files', 'createdAt', 'updatedAt', 'pinnedAt'),
        model: template.model || defaultModel,
        _id: nextProjectId(),
        icon,
        createdBy: did,
        updatedBy: did,
      });

      const repository = await getRepository({ projectId: project._id! });
      const working = await repository.working({ ref: defaultBranch });
      for (const { parent, ...file } of template.files) {
        const id = nextTemplateId();
        const key = nanoid(32);
        working.syncedStore.files[key] = await templateToYjs({ ...file, id });
        working.syncedStore.tree[key] = parent.concat(`${id}.yaml`).join('/');
      }
      await working.commit({
        ref: defaultBranch,
        branch: defaultBranch,
        message: 'First Prompt',
        author: { name: fullName, email: did },
      });

      res.json(project);
      return;
    }

    if (name && (await Projects.findOne({ where: { name } }))) {
      throw new Error(`Duplicated project ${name}`);
    }

    const project = await Projects.create({
      _id: nextProjectId(),
      model: defaultModel,
      name,
      createdBy: did,
      updatedBy: did,
    });

    res.json(project);
  });

  router.patch('/projects/:projectId', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId } = req.params;

    const project = await Projects.findOne({ where: { _id: projectId } });
    if (!project) {
      res.status(404).json({ error: 'No such project' });
      return;
    }

    const {
      name,
      pinned,
      description,
      icon,
      model,
      temperature,
      topP,
      presencePenalty,
      frequencyPenalty,
      maxTokens,
      gitType,
    } = await updateProjectSchema.validateAsync(req.body, { stripUnknown: true });

    if (name && (await Projects.findOne({ where: { name, _id: { [Op.ne]: project._id } } }))) {
      throw new Error(`Duplicated project ${name}`);
    }

    const { did } = req.user!;

    await Projects.update(
      omitBy(
        {
          name,
          pinnedAt: pinned ? new Date().toISOString() : pinned === false ? null : undefined,
          updatedBy: did,
          description,
          icon,
          model: model || project.model || defaultModel,
          temperature,
          topP,
          presencePenalty,
          frequencyPenalty,
          maxTokens,
          gitType,
        },
        (v) => v === undefined
      ),
      { where: { _id: projectId } }
    );
    const doc = await Projects.findOne({ where: { _id: projectId } });

    res.json(doc);
  });

  router.delete('/projects/:projectId', ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await Projects.findOne({ where: { _id: projectId } });
    if (!project) {
      res.status(404).json({ error: 'No such project' });
      return;
    }

    await Projects.destroy({ where: { _id: projectId } });

    const root = repositoryRoot(projectId);
    rmSync(root, { recursive: true, force: true });
    rmSync(`${root}.cooperative`, { recursive: true, force: true });

    res.json(project);
  });

  router.post('/projects/:projectId/:ref/import', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { resources, projectId, ref } = await exportImportSchema.validateAsync(req.body);

    const fns = resources.map(async (_id: string) => {
      const list = await getDeepTemplate(projectId, ref, _id);
      return list;
    });

    const templates = (await Promise.all(fns)).flat();

    return res.json({ templates: uniqBy(templates, 'id') });
  });
}
