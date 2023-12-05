import { cpSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';

import { call } from '@blocklet/sdk/lib/component';
import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import omit from 'lodash/omit';
import omitBy from 'lodash/omitBy';
import pick from 'lodash/pick';
import sample from 'lodash/sample';
import uniqBy from 'lodash/uniqBy';
import { Op } from 'sequelize';

import { defaultModel } from '../libs/models';
import { ensureComponentCallOrAdmin, ensureComponentCallOrPromptsEditor } from '../libs/security';
import { createImageUrl } from '../libs/utils';
import Project from '../store/models/projects';
import {
  autoSyncRemoteRepoIfNeeded,
  commitProjectSettingWorking,
  commitWorking,
  defaultBranch,
  defaultRemote,
  getRepository,
  getTemplateIdFromPath,
  getTemplatesFromRepository,
  nextProjectId,
  projectTemplates,
  repositoryRoot,
  syncRepository,
  templateToYjs,
} from '../store/projects';
import { Template, getTemplate, nextTemplateId } from '../store/templates';
import { getAuthorInfo } from './log';

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
  gitAutoSync?: boolean;
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
  gitAutoSync: Joi.boolean().empty([null]),
});

export interface AddProjectRemoteInput {
  url: string;
  username?: string;
  password?: string;
}

const addProjectGitRemoteSchema = Joi.object<AddProjectRemoteInput>({
  url: Joi.string()
    .uri({ scheme: ['https'] })
    .required(),
  username: Joi.string().empty([null, '']),
  password: Joi.string().empty([null, '']),
});

export interface ProjectPullInput {
  force?: boolean;
}

const pullInputSchema = Joi.object<ProjectPullInput>({
  force: Joi.boolean().empty([null]),
});

export interface ProjectPushInput {
  force?: boolean;
}

const pushInputSchema = Joi.object<ProjectPushInput>({
  force: Joi.boolean().empty([null]),
});

export interface GetProjectsQuery {
  type?: 'templates';
}

const getProjectsQuerySchema = Joi.object<GetProjectsQuery>({
  type: Joi.string().allow('templates').empty([null, '']),
});

const getDeepTemplate = async (projectId: string, ref: string, templateId: string) => {
  let templates: (Template & { parent?: string[] })[] = [];

  const repository = await getRepository({ projectId });
  const filepath = (await repository.listFiles({ ref })).find((i) => i.endsWith(`.${templateId}.yaml`));
  if (!filepath) throw new Error(`File ${templateId} not found`);

  const template = (await getTemplate({ repository, ref, templateId })) as Template & { parent?: string[] };
  template.parent = filepath.split('/').slice(0, -1);

  templates = [template];

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

export interface GetTemplateQuery {
  working?: boolean;
}

const getTemplateQuerySchema = Joi.object<GetTemplateQuery>({
  working: Joi.boolean().empty([null, '']),
});

export function projectRoutes(router: Router) {
  router.get('/projects', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { type } = await getProjectsQuerySchema.validateAsync(req.query, { stripUnknown: true });

    if (type === 'templates') {
      res.json({ projects: projectTemplates });
      return;
    }

    const list = await Project.findAll({
      order: [
        ['pinnedAt', 'DESC'],
        ['updatedAt', 'DESC'],
      ],
    });

    const projects = await Promise.all(
      list.map(async (project) => {
        let users: { name?: string; email?: string; did?: string; fullName?: string; avatar?: string }[] = [];
        let templateCount = 0;

        const repository = await getRepository({ projectId: project._id });
        const branches = await repository.listBranches();

        // 缓存之前是有做的
        try {
          const commits = await getAuthorInfo({ projectId: project._id, ref: defaultBranch });
          users = uniqBy(
            commits.map((commit) => pick(commit.commit.author, 'name', 'email', 'did', 'fullName', 'avatar')),
            'email'
          );
        } catch (error) {
          console.error(error);
        }

        try {
          const templates = await getTemplatesFromRepository({ projectId: project._id, ref: defaultBranch });
          templateCount = templates.length;
        } catch (error) {
          console.error(error);
        }

        return { ...project.dataValues, users, branches, templateCount };
      })
    );

    res.json({ projects });
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

    const project = await Project.findOne({ where: { _id: projectId } });
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
      const original = await Project.findOne({ where: { _id: duplicateFrom } });
      if (!original) throw new Error(`Project ${duplicateFrom} not found`);

      const repo = await getRepository({ projectId: original._id! });

      const project = await Project.create({
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

      const project = await Project.create({
        ...omit(template, 'name', 'files', 'createdAt', 'updatedAt', 'pinnedAt'),
        model: template.model || defaultModel,
        _id: nextProjectId(),
        icon,
        createdBy: did,
        updatedBy: did,
      });

      const repository = await getRepository({ projectId: project._id!, author: { name: fullName, email: did } });
      const working = await repository.working({ ref: defaultBranch });
      for (const { parent, ...file } of template.files) {
        const id = nextTemplateId();
        working.syncedStore.files[id] = templateToYjs({ ...file, id });
        working.syncedStore.tree[id] = parent.concat(`${id}.yaml`).join('/');
      }
      await commitWorking({
        project,
        ref: defaultBranch,
        branch: defaultBranch,
        message: 'First Commit',
        author: { name: fullName, email: did },
      });

      res.json(project);
      return;
    }

    if (name && (await Project.findOne({ where: { name } }))) {
      throw new Error(`Duplicated project ${name}`);
    }

    const project = await Project.create({
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

    const project = await Project.findOne({ where: { _id: projectId } });
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
      gitAutoSync,
    } = await updateProjectSchema.validateAsync(req.body, { stripUnknown: true });

    if (name && (await Project.findOne({ where: { name, _id: { [Op.ne]: project._id } } }))) {
      throw new Error(`Duplicated project ${name}`);
    }

    const { did, fullName } = req.user!;

    await project.update(
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
          gitAutoSync,
        },
        (v) => v === undefined
      )
    );

    const author = { name: fullName, email: did };
    await commitProjectSettingWorking({ project, author });

    await autoSyncRemoteRepoIfNeeded({ project, author });

    res.json(project.dataValues);
  });

  router.delete('/projects/:projectId', ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await Project.findOne({ where: { _id: projectId } });
    if (!project) {
      res.status(404).json({ error: 'No such project' });
      return;
    }

    await project.destroy();

    const root = repositoryRoot(projectId);
    rmSync(root, { recursive: true, force: true });
    rmSync(`${root}.cooperative`, { recursive: true, force: true });

    res.json(project);
  });

  router.post('/projects/:projectId/:ref/import', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { resources, projectId, ref } = await exportImportSchema.validateAsync(req.body);

    const templates = (
      await Promise.all(
        resources.map(async (filepath: string) => {
          const templateId = getTemplateIdFromPath(filepath);
          if (!templateId) return [];
          return getDeepTemplate(projectId, ref, templateId);
        })
      )
    ).flat();

    return res.json({ templates: uniqBy(templates, 'id') });
  });

  router.post('/projects/:projectId/remote', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

    const input = await addProjectGitRemoteSchema.validateAsync(req.body, { stripUnknown: true });

    const url = new URL(input.url);
    if (input.username) url.username = input.username;
    if (input.password) url.password = input.password;

    const repository = await getRepository({ projectId });

    // Check the connection
    await repository.getRemoteInfo({ url: url.toString() });

    await repository.addRemote({ remote: defaultRemote, url: url.toString(), force: true });

    const urlWithoutPassword = new URL(url);
    urlWithoutPassword.password = '';
    await project.update({ gitUrl: urlWithoutPassword.toString() });

    res.json({});
  });

  router.post('/projects/:projectId/remote/push', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const input = await pushInputSchema.validateAsync(req.body, { stripUnknown: true });

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

    const repository = await getRepository({ projectId });
    const branches = await repository.listBranches();
    for (const ref of branches) {
      await repository.push({ remote: defaultRemote, ref, force: input.force });
    }

    await project.update({ gitLastSyncedAt: new Date() });

    res.json({});
  });

  router.post('/projects/:projectId/remote/pull', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { did: userId, fullName } = req.user!;

    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const input = await pullInputSchema.validateAsync(req.body, { stripUnknown: true });

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

    const repository = await getRepository({ projectId });
    const remote = (await repository.listRemotes()).find((i) => i.remote === defaultRemote);
    if (!remote) throw new Error('The remote has not been set up yet');

    const branches = await repository.listBranches();

    for (const ref of branches) {
      if (input.force) {
        await repository.fetch({ remote: defaultRemote, ref });
        await repository.branch({
          ref,
          object: `${defaultRemote}/${ref}`,
          checkout: true,
          force: true,
        });
      } else {
        await repository.pull({ remote: defaultRemote, ref, author: { name: fullName, email: userId } });
      }
    }

    await project.update({ gitLastSyncedAt: new Date() });

    res.json({});
  });

  router.post('/projects/:projectId/remote/sync', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { did: userId, fullName } = req.user!;

    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });
    const repository = await getRepository({ projectId });
    const branches = await repository.listBranches();

    for (const ref of branches) {
      await syncRepository({ repository, ref, author: { name: fullName, email: userId } });
    }

    await project.update({ gitLastSyncedAt: new Date() });

    res.json({});
  });

  router.get('/projects/:projectId/refs/:ref/templates/:templateId', async (req, res) => {
    const { projectId, ref, templateId } = req.params;
    const query = await getTemplateQuerySchema.validateAsync(req.query, { stripUnknown: true });

    await Project.findByPk(projectId, { rejectOnEmpty: new Error(`Project ${projectId} not found`) });

    const repository = await getRepository({ projectId });

    const template = await getTemplate({ repository, ref, templateId, working: query.working });

    res.json(pick(template, 'id', 'name', 'type', 'parameters'));
  });
}
