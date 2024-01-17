import { cpSync, existsSync, rmSync } from 'fs';
import { dirname, join } from 'path';

import { fileToYjs, nextAssistantId } from '@blocklet/ai-runtime/types';
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

import { ensureComponentCallOrAdmin, ensureComponentCallOrPromptsEditor } from '../libs/security';
import { createImageUrl } from '../libs/utils';
import Project, { nextProjectId } from '../store/models/project';
import {
  autoSyncRemoteRepoIfNeeded,
  commitProjectSettingWorking,
  commitWorking,
  defaultBranch,
  defaultRemote,
  getAssistantFromRepository,
  getAssistantIdFromPath,
  getRepository,
  repositoryRoot,
  syncRepository,
} from '../store/repository';
import { projectTemplates } from '../templates/projects';
import { getCommits } from './log';

let icons: { filename: string }[] = [];
const AI_STUDIO_COMPONENT_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

export interface CreateProjectInput {
  duplicateFrom?: string;
  templateId?: string;
  name?: string;
  description?: string;
  isImport?: boolean;
}

const createProjectSchema = Joi.object<CreateProjectInput>({
  duplicateFrom: Joi.string().empty([null, '']),
  templateId: Joi.string().empty([null, '']),
  name: Joi.string().empty([null, '']),
  description: Joi.string().empty([null, '']),
  isImport: Joi.boolean().default(false),
});

const exportSchema = Joi.object<{
  projectId: string;
  ref: string;
  resources: string[];
}>({
  projectId: Joi.string().required().min(1),
  ref: Joi.string(),
  resources: Joi.array().items(Joi.string()).required(),
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
        const repository = await getRepository({ projectId: project._id });
        const branches = await repository.listBranches();
        const users = await getAuthorsOfProject({ projectId: project._id });
        return { ...project.dataValues, users, branches };
      })
    );

    res.json({ projects });
  });

  router.get('/projects/icons', ensureComponentCallOrPromptsEditor(), async (_req, res) => {
    const { data } = await call({
      name: 'image-bin',
      path: '/api/sdk/uploads',
      method: 'GET',
      params: { pageSize: 100, folderId: AI_STUDIO_COMPONENT_DID },
    });

    res.json({ icons: data?.uploads || [] });
  });

  router.delete('/projects/icon/:id', ensureComponentCallOrPromptsEditor(), user(), async (req, res) => {
    const { did } = req.user!;
    const { data } = await call({
      name: 'image-bin',
      path: `/api/sdk/uploads/${req.params.id}`,
      method: 'DELETE',
      headers: { 'x-user-did': did },
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
    const { duplicateFrom, templateId, name, description, isImport } = await createProjectSchema.validateAsync(
      req.body,
      {
        stripUnknown: true,
      }
    );
    const { did, fullName } = req.user!;

    if (duplicateFrom) {
      const original = await Project.findOne({ where: { _id: duplicateFrom } });
      if (!original) throw new Error(`Project ${duplicateFrom} not found`);

      const repo = await getRepository({ projectId: original._id! });

      const project = await Project.create({
        ...original.dataValues,
        _id: nextProjectId(),
        model: original.model || '',
        name: original.name && `${original.name}-copy`,
        description,
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
          const params = { pageSize: 100, tags: 'default-project-icon' };
          const { data } = await call({ name: 'image-bin', path: '/api/sdk/uploads', method: 'GET', params });

          icons = data?.uploads || [];
        } catch (error) {
          // error
        }
      }

      const item = sample(icons);
      if (item?.filename) {
        icon = createImageUrl(`${req.protocol}://${req.hostname}`, item.filename);
      }

      const project = await Project.create({
        ...omit(template, 'name', 'files', 'createdAt', 'updatedAt', 'pinnedAt'),
        _id: nextProjectId(),
        model: template.model || '',
        icon,
        createdBy: did,
        updatedBy: did,
        name,
        description,
      });

      const repository = await getRepository({ projectId: project._id!, author: { name: fullName, email: did } });
      if (!isImport) {
        const working = await repository.working({ ref: defaultBranch });
        for (const { parent, ...file } of template.files) {
          const id = nextAssistantId();
          working.syncedStore.files[id] = fileToYjs({ ...file, id });
          working.syncedStore.tree[id] = parent.concat(`${id}.yaml`).join('/');
        }
        await commitWorking({
          project,
          ref: defaultBranch,
          branch: defaultBranch,
          message: 'First Commit',
          author: { name: fullName, email: did },
        });
      }

      res.json(project);
      return;
    }

    if (name && (await Project.findOne({ where: { name } }))) {
      throw new Error(`Duplicated project ${name}`);
    }

    const project = await Project.create({
      model: '',
      createdBy: did,
      updatedBy: did,
      name,
      description,
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
          model: model || project.model || '',
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

  router.delete('/projects/:projectId/remote', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

    const repository = await getRepository({ projectId });

    await repository.deleteRemote({ remote: defaultRemote });

    await project.update({ gitUrl: null! });

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
        await repository.branch({ ref, object: `${defaultRemote}/${ref}`, checkout: true, force: true });
        (await repository.working({ ref })).reset();
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

  router.get('/projects/:projectId/refs/:ref/assistants/:assistantId', async (req, res) => {
    const { projectId, ref, assistantId } = req.params;
    const query = await getTemplateQuerySchema.validateAsync(req.query, { stripUnknown: true });

    await Project.findByPk(projectId, { rejectOnEmpty: new Error(`Project ${projectId} not found`) });

    const repository = await getRepository({ projectId });

    const assistant = await getAssistantFromRepository({ repository, ref, assistantId, working: query.working });

    res.json(pick(assistant, 'id', 'name', 'type', 'parameters', 'createdAt', 'updatedAt'));
  });

  router.get(
    '/projects/compare/:projectId/:ref/:assistantId',
    user(),
    ensureComponentCallOrPromptsEditor(),
    async (req, res) => {
      const { projectId = '', ref = '', assistantId = '' } = req.params;
      const query = await getTemplateQuerySchema.validateAsync(req.query, { stripUnknown: true });

      await Project.findByPk(projectId, { rejectOnEmpty: new Error(`Project ${projectId} not found`) });

      const repository = await getRepository({ projectId });

      const assistant = await getAssistantFromRepository({ repository, ref, assistantId, working: query.working });

      res.json(assistant);
    }
  );

  router.post('/projects/export/:projectId/:ref', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { resources, projectId, ref } = await exportSchema.validateAsync(req.body);

    const assistants = (
      await Promise.all(
        resources.map(async (filepath: string) => {
          const assistantId = getAssistantIdFromPath(filepath);
          if (!assistantId) return [];
          const repository = await getRepository({ projectId });
          const p = (await repository.listFiles({ ref })).find((i) => i.endsWith(`${assistantId}.yaml`));
          const parent = p ? p.split('/').slice(0, -1) : [];
          const result = await getAssistantFromRepository({ repository, ref, assistantId });
          return { ...result, parent };
        })
      )
    ).flat();

    return res.json({ assistants: uniqBy(assistants, 'id') });
  });
}

const getAuthorsOfProject = async ({ projectId }: { projectId: string }) => {
  try {
    const commits = await getCommits({ projectId, ref: defaultBranch });
    return uniqBy(
      commits
        .map((commit) => pick(commit.commit.author, 'did', 'fullName', 'avatar'))
        .filter((i): i is typeof i & { did: string } => !!i.did),
      'did'
    );
  } catch (error) {
    console.error(error);
  }
  return [];
};
