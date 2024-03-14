import fs from 'fs';
import { cp, mkdtemp, rm } from 'fs/promises';
import { dirname, join } from 'path';

import { Config } from '@api/libs/env';
import { fileToYjs, nextAssistantId } from '@blocklet/ai-runtime/types';
import { call } from '@blocklet/sdk/lib/component';
import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import { pathExists } from 'fs-extra';
import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import Joi from 'joi';
import omit from 'lodash/omit';
import omitBy from 'lodash/omitBy';
import pick from 'lodash/pick';
import sample from 'lodash/sample';
import uniqBy from 'lodash/uniqBy';
import { Op } from 'sequelize';
import { parse } from 'yaml';

import { copyAssistantsFromResource, getResourceProjects } from '../libs/resource';
import { ensureComponentCallOrAdmin, ensureComponentCallOrPromptsEditor } from '../libs/security';
import { createImageUrl } from '../libs/utils';
import Project, { nextProjectId } from '../store/models/project';
import {
  autoSyncIfNeeded,
  clearRepository,
  commitProjectSettingWorking,
  commitWorking,
  defaultBranch,
  defaultRemote,
  getAssistantFromRepository,
  getAssistantIdFromPath,
  getRepository,
  repositoryRoot,
  syncRepository,
  syncToDidSpace,
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
}

const createProjectSchema = Joi.object<CreateProjectInput>({
  duplicateFrom: Joi.string().empty([null, '']),
  templateId: Joi.string().empty([null, '']),
  name: Joi.string().empty([null, '']),
  description: Joi.string().empty([null, '']),
});

export interface ImportProjectInput {
  url: string;
  username?: string;
  password?: string;
  templateId?: string;
  name?: string;
  description?: string;
}

const importProjectSchema = Joi.object<ImportProjectInput>({
  url: Joi.string()
    .uri({ scheme: ['https'] })
    .required(),
  username: Joi.string().empty([null, '']),
  password: Joi.string().empty([null, '']),
  name: Joi.string().empty([null, '']),
  description: Joi.string().empty([null, '']),
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
  didSpaceAutoSync?: true | false;
  projectType?: Project['projectType'];
  homePageUrl?: string | null;
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
  projectType: Joi.string().valid('project', 'template', 'example').empty([null, '']),
  homePageUrl: Joi.string().allow(null, ''),
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

export interface GetTemplateQuery {
  working?: boolean;
}

const getTemplateQuerySchema = Joi.object<GetTemplateQuery>({
  working: Joi.boolean().empty([null, '']),
});

export type SyncTarget = 'github' | 'didSpace';

export function projectRoutes(router: Router) {
  router.get('/projects', ensureComponentCallOrPromptsEditor(), async (_, res) => {
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
        const users = await getAuthorsOfProject({
          projectId: project._id,
          gitDefaultBranch: project.gitDefaultBranch,
        });
        return { ...project.dataValues, users, branches };
      })
    );

    res.json({
      templates: uniqBy(
        [
          ...projectTemplates,
          ...projects.filter((i) => i.projectType === 'template'),
          ...(await getResourceProjects('template')).map((x) => {
            x.fromResourceBlockletFolder = 'template';
            return x;
          }),
        ],
        '_id'
      ),
      projects: projects.filter((i) => !i.projectType || i.projectType === 'project'),
      examples: uniqBy(
        [
          ...projects.filter((i) => i.projectType === 'example'),
          ...(await getResourceProjects('example')).map((x) => {
            x.fromResourceBlockletFolder = 'example';
            return x;
          }),
        ],
        '_id'
      ),
    });
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
      const found = (await getResourceProjects('example')).find((x) => x._id === projectId);
      if (found) {
        res.json(found);
        return;
      }

      res.status(404).json({ error: 'No such project' });
      return;
    }

    res.json(project);
  });

  router.post('/projects', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { duplicateFrom, templateId, name, description } = await createProjectSchema.validateAsync(req.body, {
      stripUnknown: true,
    });

    const { did, fullName } = req.user!;

    if (duplicateFrom) {
      const original = await Project.findOne({ where: { _id: duplicateFrom } });
      if (!original) throw new Error(`Project ${duplicateFrom} not found`);

      const project = await copyProject({ project: original, name, description, createdBy: did, updatedBy: did });

      res.json(project);
      return;
    }

    if (templateId) {
      const templateOfProject = await Project.findOne({ where: { _id: templateId, projectType: 'template' } });
      if (templateOfProject) {
        const project = await copyProject({
          project: templateOfProject,
          name,
          description,
          createdBy: did,
          updatedBy: did,
          projectType: 'project',
        });
        res.json(project);
        return;
      }

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
      gitDefaultBranch: defaultBranch,
      name,
      description,
    });

    res.json(project);
  });

  router.post('/projects/import', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { name, username, password, description, url } = await importProjectSchema.validateAsync(req.body, {
      stripUnknown: true,
    });
    const { did } = req.user!;

    if (name && (await Project.findOne({ where: { name } }))) {
      throw new Error(`Duplicated project ${name}`);
    }

    const uri = new URL(url);
    if (username) uri.username = username;
    if (password) uri.password = password;

    let originProject;
    let originDefaultBranch = defaultBranch;

    const tempFolder = await mkdtemp(join(Config.dataDir, 'repositories', 'temp-'));
    try {
      await git.clone({ fs, dir: tempFolder, http, url: uri.toString() });

      const originRepo = await git.fetch({ fs, http, dir: tempFolder, remote: defaultRemote });

      if (originRepo.defaultBranch) {
        originDefaultBranch = originRepo.defaultBranch?.split('/').pop()!;
        await git.checkout({ fs, dir: tempFolder, ref: originDefaultBranch });

        const gitdir = join(tempFolder, '.git');
        const oid = await git.resolveRef({ fs, gitdir, ref: originRepo.defaultBranch });
        originProject = parse(
          Buffer.from((await git.readBlob({ fs, gitdir, oid, filepath: '.settings.yaml' })).blob).toString()
        );
      }

      if (!originProject?._id)
        throw new Error('The project ID does not exist; only ai-studio projects can be imported.');

      const oldProject = await Project.findOne({ where: { _id: originProject?._id } });
      if (oldProject)
        throw new Error(
          `The project(${oldProject.name}) already exists and cannot be imported. Please delete the existing project and try again.`
        );

      const projectId: string = originProject?._id;

      const repository = await getRepository({ projectId });

      await repository.addRemote({ remote: defaultRemote, url: uri.toString(), force: true });
      const urlWithoutPassword = new URL(url);
      urlWithoutPassword.password = '';
      if (originDefaultBranch !== 'main') {
        await repository.renameBranch({ ref: originDefaultBranch, oldRef: 'main' });
      }
      const branches = await repository.listBranches();
      for (const ref of branches) {
        await repository.fetch({ remote: defaultRemote, ref });
        await repository.branch({ ref, object: `${defaultRemote}/${ref}`, checkout: true, force: true });
        (await repository.working({ ref })).reset();
      }
      await repository.checkout({ ref: originDefaultBranch, force: true });

      const data: Project = parse(
        Buffer.from(
          (
            await repository.readBlob({
              ref: originDefaultBranch!,
              filepath: '.settings.yaml',
            })
          ).blob
        ).toString()
      );

      const project = await Project.create({
        ...data,
        _id: projectId,
        gitUrl: urlWithoutPassword.toString(),
        gitDefaultBranch: originDefaultBranch,
        model: data.model,
        createdBy: did,
        updatedBy: did,
        name,
        gitLastSyncedAt: new Date(),
        description,
      });

      res.json(project);
    } finally {
      await rm(tempFolder, { recursive: true, force: true });
    }
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
      projectType,
      homePageUrl,
    } = await updateProjectSchema.validateAsync(req.body, { stripUnknown: true });

    if (name && (await Project.findOne({ where: { name, _id: { [Op.ne]: project._id } } }))) {
      throw new Error(`Duplicated project ${name}`);
    }

    const { did: userId, fullName } = req.user!;

    await project.update(
      omitBy(
        {
          name,
          pinnedAt: pinned ? new Date().toISOString() : pinned === false ? null : undefined,
          updatedBy: userId,
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
          projectType,
          homePageUrl,
        },
        (v) => v === undefined
      )
    );

    const author = { name: fullName, email: userId };
    await commitProjectSettingWorking({ project, author });

    await autoSyncIfNeeded({ project, author, userId });

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

    await clearRepository(projectId);

    const root = repositoryRoot(projectId);
    await Promise.all([
      rm(root, { recursive: true, force: true }),
      rm(`${root}.cooperative`, { recursive: true, force: true }),
    ]);

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
    await repository.checkout({ ref: defaultBranch, force: true });

    await project.update({ gitLastSyncedAt: new Date() });

    res.json({});
  });

  router.post('/projects/:projectId/remote/sync', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { did: userId, fullName } = req.user!;

    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });
    const repository = await getRepository({ projectId });

    const target: SyncTarget = req.query.target as SyncTarget;
    if (target === 'didSpace') {
      await syncToDidSpace({ project, userId });

      return res.json({});
    }

    if (target === 'github') {
      const branches = await repository.listBranches();
      for (const ref of branches) {
        // eslint-disable-next-line no-await-in-loop
        await syncRepository({ repository, ref, author: { name: fullName, email: userId } });
      }
      await project.update({ gitLastSyncedAt: new Date() });

      return res.json({});
    }

    throw new Error(`Could not back up to target(${target})`);
  });

  router.get('/projects/:projectId/refs/:ref/assistants/:assistantId', async (req, res) => {
    const { projectId, ref, assistantId } = req.params;
    const query = await getTemplateQuerySchema.validateAsync(req.query, { stripUnknown: true });

    await Project.findByPk(projectId, { rejectOnEmpty: new Error(`Project ${projectId} not found`) });

    const repository = await getRepository({ projectId });

    const assistant = await getAssistantFromRepository({ repository, ref, assistantId, working: query.working });

    res.json(pick(assistant, 'id', 'name', 'description', 'type', 'parameters', 'createdAt', 'updatedAt'));
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

  router.post('/projects/copy', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { folder, projectId, name, description } = await Joi.object<{
      folder: string;
      projectId: string;
      name?: string;
      description?: string;
    }>({
      projectId: Joi.string().required().min(1),
      folder: Joi.string(),
      name: Joi.string().empty([null, '']),
      description: Joi.string().empty([null, '']),
    }).validateAsync(req.body);

    const { fullName, did } = req.user!;

    const id = folder === 'template' ? nextProjectId() : projectId;

    const project =
      folder === 'template'
        ? {
            _id: id,
            name,
            description,
            createdBy: did,
            updatedBy: did,
            projectType: 'project',
          }
        : undefined;

    await copyAssistantsFromResource({
      folder,
      findProjectId: projectId,
      newProjectId: id,
      originDefaultBranch:
        folder === 'template'
          ? 'main'
          : (await Project.findOne({ where: { _id: projectId } }))?.gitDefaultBranch || defaultBranch,
      fullName,
      did,
      projectInfo: project,
    });

    return res.json({ _id: id });
  });
}

const getAuthorsOfProject = async ({
  projectId,
  gitDefaultBranch,
}: {
  projectId: string;
  gitDefaultBranch: string;
}) => {
  try {
    const commits = await getCommits({ projectId, ref: gitDefaultBranch });
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

async function copyProject({
  project: original,
  ...patch
}: {
  project: Project;
} & Partial<Project['dataValues']>) {
  const repo = await getRepository({ projectId: original._id! });

  const project = await Project.create({
    ...original.dataValues,
    _id: nextProjectId(),
    model: original.model || '',
    ...patch,
    name: patch.name || (original.name && `${original.name}-copy`),
  });

  const parent = dirname(repo.root);
  await cp(repo.root, join(parent, project._id!), { recursive: true });
  if (await pathExists(`${repo.root}.cooperative`)) {
    await cp(`${repo.root}.cooperative`, join(parent, `${project._id}.cooperative`), { recursive: true });
  }

  return project;
}
