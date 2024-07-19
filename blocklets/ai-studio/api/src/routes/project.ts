import fs from 'fs';
import { mkdir, mkdtemp, readFile, rm } from 'fs/promises';
import { basename, dirname, isAbsolute, join } from 'path';

import { Config } from '@api/libs/env';
import { NoPermissionError, NotFoundError } from '@api/libs/error';
import { sampleIcon } from '@api/libs/icon';
import { uploadImageToImageBin } from '@api/libs/image-bin';
import logger from '@api/libs/logger';
import AgentInputSecret from '@api/store/models/agent-input-secret';
import {
  ProjectSettings,
  fileToYjs,
  isAssistant,
  nextAssistantId,
  projectSettingsSchema,
  variableToYjs,
} from '@blocklet/ai-runtime/types';
import { copyRecursive } from '@blocklet/ai-runtime/utils/fs';
import { call } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import { user } from '@blocklet/sdk/lib/middlewares';
import { Request, Router } from 'express';
import { exists } from 'fs-extra';
import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import Joi from 'joi';
import omit from 'lodash/omit';
import omitBy from 'lodash/omitBy';
import pick from 'lodash/pick';
import uniqBy from 'lodash/uniqBy';
import { joinURL, parseAuth, parseURL } from 'ufo';
import { parse } from 'yaml';

import { getProjectFromResource, getResourceProjects } from '../libs/resource';
import {
  ensureComponentCallOrPromptsAdmin,
  ensureComponentCallOrPromptsEditor,
  ensureComponentCallOrRolesMatch,
} from '../libs/security';
import Project, { nextProjectId } from '../store/models/project';
import {
  ASSETS_DIR,
  CONFIG_FILENAME,
  CONFIG_FILE_KEY,
  CONFIG_FOLDER,
  LOGO_FILENAME,
  ProjectRepo,
  SETTINGS_FILE,
  VARIABLE_FILENAME,
  VARIABLE_KEY,
  autoSyncIfNeeded,
  clearRepository,
  defaultBranch,
  defaultRemote,
  getAssistantFromRepository,
  getAssistantIdFromPath,
  getProjectMemoryVariables,
  getRepository,
  repositoryRoot,
  syncRepository,
  syncToDidSpace,
} from '../store/repository';
import { projectTemplates } from '../templates/projects';
import { getCommits } from './log';

const AI_STUDIO_COMPONENT_DID = 'z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB';

export interface CreateProjectInput {
  blockletDid?: string;
  templateId?: string;
  withDuplicateFrom?: boolean;
  name?: string;
  description?: string;
}

const createProjectSchema = Joi.object<CreateProjectInput>({
  blockletDid: Joi.string().empty([null, '']),
  templateId: Joi.string().empty([null, '']),
  withDuplicateFrom: Joi.boolean().empty([null, '']),
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
  appearance?: {
    primaryColor?: string;
    typography?: {
      fontFamily?: string;
      heading?: {
        fontFamily?: string;
      };
    };
  };
}

const updateProjectSchema = Joi.object<UpdateProjectInput>({
  name: Joi.string().empty([null, '']),
  description: Joi.string().empty([null, '']),
  pinned: Joi.boolean().empty([null]),
  model: Joi.string().empty([null, '']),
  temperature: Joi.number().min(0).max(2).empty(null),
  topP: Joi.number().min(0.1).max(1).empty(null),
  presencePenalty: Joi.number().min(-2).max(2).empty(null),
  frequencyPenalty: Joi.number().min(-2).max(2).empty(null),
  maxTokens: Joi.number().integer().empty(null),
  gitType: Joi.string().valid('simple', 'default').empty([null, '']),
  gitAutoSync: Joi.boolean().empty([null]),
  didSpaceAutoSync: Joi.boolean().optional(),
  homePageUrl: Joi.string().allow(null, ''),
  appearance: Joi.object({
    primaryColor: Joi.string().empty([null, '']),
    typography: Joi.object({
      fontFamily: Joi.string().empty([null, '']),
      heading: Joi.object({
        fontFamily: Joi.string().empty([null, '']),
      }),
    }),
  }),
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

const getAgentQuerySchema = Joi.object<GetTemplateQuery>({
  working: Joi.boolean().empty([null, '']),
});

export type SyncTarget = 'github' | 'didSpace';

export const getProjectWhereConditions = (req: Request) => {
  // default to only show projects created by the user
  let projectWhereConditions = {
    createdBy: req.user!.did,
  } as any;

  // if the user has the permission to view all projects, show all projects
  if (ensureComponentCallOrRolesMatch(req, Config.serviceModePermissionMap.ensureViewAllProjectsRoles)) {
    projectWhereConditions = {};
  }

  return projectWhereConditions;
};

export const checkProjectPermission = ({ req, project }: { req: Request; project: Project | null | undefined }) => {
  if (
    project?.createdBy === req.user?.did ||
    ensureComponentCallOrRolesMatch(req, Config.serviceModePermissionMap.ensureViewAllProjectsRoles) ||
    ensureComponentCallOrRolesMatch(req, Config.serviceModePermissionMap.ensurePromptsAdminRoles)
  ) {
    return true;
  }

  throw new NoPermissionError('You are not authorized to access this project');
};

export const checkProjectLimit = async ({ req }: { req: Request }) => {
  if (config.env.preferences.serviceMode === 'multi-tenant') {
    // check project count limit
    const count = await Project.count({ where: { createdBy: req.user?.did } });
    const currentLimit = config.env.preferences.multiTenantProjectLimits;
    if (
      count >= currentLimit &&
      !ensureComponentCallOrRolesMatch(req, Config.serviceModePermissionMap.ensurePromptsAdminRoles)
    ) {
      throw new Error(`Project limit exceeded (current: ${count}, limit: ${currentLimit}) `);
    }
  }
};

export interface CreateOrUpdateAgentInputSecretPayload {
  secrets: {
    targetProjectId: string;
    targetAgentId: string;
    targetInputKey: string;
    secret: string;
  }[];
}

export function projectRoutes(router: Router) {
  router.get('/projects', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const list = await Project.findAll({
      where: {
        ...getProjectWhereConditions(req),
      },
      order: [
        ['pinnedAt', 'DESC'],
        ['updatedAt', 'DESC'],
      ],
    });

    const projects = await Promise.all(
      list.map(async (project) => {
        const repository = await getRepository({ projectId: project.id });
        const branches = await repository.listBranches();

        const working = await repository.working({ ref: project.gitDefaultBranch });
        const projectSetting = working.syncedStore.files[SETTINGS_FILE] as ProjectSettings | undefined;

        const users = await getAuthorsOfProject({
          projectId: project.id,
          gitDefaultBranch: project.gitDefaultBranch,
        });
        return {
          ...project.dataValues,
          users,
          branches,
          ...pick(projectSetting, 'iconVersion', 'name', 'description'),
        };
      })
    );

    const resourceTemplates = (await getResourceProjects('template')).map((i) => ({
      ...i.project,
      blockletDid: i.blocklet.did,
    }));
    const resourceExamples = (await getResourceProjects('example')).map((i) => ({
      ...i.project,
      blockletDid: i.blocklet.did,
    }));

    // multi-tenant mode
    if (config.env.preferences.serviceMode === 'multi-tenant') {
      res.json({
        templates: uniqBy([...projectTemplates.map((i) => i.project), ...resourceTemplates], (i) => i.id),
        projects,
        examples: uniqBy(resourceExamples, (i) => i.id),
      });
      return;
    }

    // single-tenant mode
    const resourceExampleIds = new Set(resourceExamples.map((i) => i.id));
    const exampleProjects = projects.filter((i) => resourceExampleIds.has(i.duplicateFrom!));
    const exampleProjectFromIds = new Set(exampleProjects.map((i) => i.duplicateFrom));
    const notCreatedExamples = resourceExamples.filter((i) => !exampleProjectFromIds.has(i.id));

    res.json({
      templates: uniqBy([...projectTemplates.map((i) => i.project), ...resourceTemplates], (i) => i.id),
      projects: projects.filter((i) => !resourceExampleIds.has(i.duplicateFrom!)),
      examples: uniqBy([...exampleProjects, ...notCreatedExamples], (i) => i.id),
    });
  });

  router.get('/projects/icons', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { did } = req.user!;

    const { data } = await call({
      name: 'image-bin',
      path: '/api/sdk/uploads',
      method: 'GET',
      headers: { 'x-user-did': did },
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

  const logoQuerySchema = Joi.object<{ blockletDid?: string; projectRef?: string; working?: boolean }>({
    blockletDid: Joi.string().empty(['', null]),
    projectRef: Joi.string().empty(['', null]),
    working: Joi.boolean().empty(['', null]),
  });

  router.get('/projects/:projectId/logo.png', async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required parameter `projectId`');

    const query = await logoQuerySchema.validateAsync(req.query, { stripUnknown: true });

    if (query.blockletDid) {
      const resource = await getProjectFromResource({ blockletDid: query.blockletDid, projectId });

      if (resource?.gitLogoPath && (await exists(resource.gitLogoPath))) {
        res.sendFile(resource.gitLogoPath);
        return;
      }

      throw new NotFoundError(`No such project icon ${projectId}`);
    }

    const original = await Project.findOne({ where: { id: projectId } });
    if (original) {
      const repository = await getRepository({ projectId });
      const working = await repository.working({ ref: query.projectRef || original.gitDefaultBranch });

      if (query.working) {
        const logoPath = join(working.workingDir, LOGO_FILENAME);
        if (await exists(logoPath)) {
          res.setHeader('Content-Type', 'image/png');
          res.sendFile(logoPath);
          return;
        }
      }

      const { blob } = await repository.readBlob({
        ref: query.projectRef || original.gitDefaultBranch,
        filepath: LOGO_FILENAME,
      });
      res.setHeader('Content-Type', 'image/png');
      res.end(Buffer.from(blob));
      return;
    }

    throw new NotFoundError(`No such project ${projectId}`);
  });

  const getProjectQuerySchema = Joi.object<{ projectRef?: string; working?: boolean }>({
    projectRef: Joi.string().empty(['', null]),
    working: Joi.boolean().empty(['', null]),
  });

  router.get('/projects/:projectId', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required param `projectId`');

    const query = await getProjectQuerySchema.validateAsync(req.query, { stripUnknown: true });

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new NotFoundError('No such project') });

    let settings: ProjectSettings | undefined;

    const repo = await ProjectRepo.load({ projectId });
    if (query.working) {
      const w = await repo.working({ ref: query.projectRef || project.gitDefaultBranch || defaultBranch });
      settings = w.syncedStore.files[SETTINGS_FILE] as ProjectSettings;
    } else {
      try {
        const { blob } = await repo.readBlob({
          ref: project.gitDefaultBranch || defaultBranch,
          filepath: SETTINGS_FILE,
        });
        const str = Buffer.from(blob).toString();
        settings = parse(str);
      } catch (error) {
        logger.error('Error reading settings file', error);
      }
    }

    checkProjectPermission({ req, project });

    res.json({ ...project.dataValues, ...settings });
  });

  router.get(
    '/projects/:projectId/agent-input-secrets',
    user(),
    ensureComponentCallOrPromptsEditor(),
    async (req, res) => {
      const { projectId } = req.params;
      if (!projectId) throw new Error('Missing required param `projectId`');

      const project = await Project.findOne({ where: { id: projectId }, rejectOnEmpty: new Error('No such project') });

      checkProjectPermission({ req, project });

      const secrets = await AgentInputSecret.findAll({ where: { projectId }, attributes: { exclude: ['secret'] } });

      res.json({ secrets });
    }
  );

  const createOrUpdateAgentInputSecretPayloadSchema = Joi.object<CreateOrUpdateAgentInputSecretPayload>({
    secrets: Joi.array()
      .items(
        Joi.object({
          targetProjectId: Joi.string().required(),
          targetAgentId: Joi.string().required(),
          targetInputKey: Joi.string().required(),
          secret: Joi.string().required(),
        })
      )
      .required()
      .min(1),
  });

  router.post(
    '/projects/:projectId/agent-input-secrets',
    user(),
    ensureComponentCallOrPromptsEditor(),
    async (req, res) => {
      const { did: userId } = req.user!;

      const { projectId } = req.params;
      if (!projectId) throw new Error('Missing required param `projectId`');

      const input = await createOrUpdateAgentInputSecretPayloadSchema.validateAsync(req.body, { stripUnknown: true });

      const project = await Project.findOne({ where: { id: projectId }, rejectOnEmpty: new Error('No such project') });

      checkProjectPermission({ req, project });

      await Promise.all(
        input.secrets.map((item) =>
          AgentInputSecret.destroy({
            where: {
              projectId,
              targetProjectId: item.targetProjectId,
              targetAgentId: item.targetAgentId,
              targetInputKey: item.targetInputKey,
            },
          })
        )
      );

      await AgentInputSecret.bulkCreate(
        input.secrets.map((item) => ({
          projectId,
          targetProjectId: item.targetProjectId,
          targetAgentId: item.targetAgentId,
          targetInputKey: item.targetInputKey,
          secret: item.secret,
          createdBy: userId,
          updatedBy: userId,
        }))
      );

      const secrets = await AgentInputSecret.findAll({ where: { projectId }, attributes: { exclude: ['secret'] } });

      res.json({ secrets });
    }
  );

  router.post('/projects', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { did } = req.user!;

    const { blockletDid, templateId, name, description, withDuplicateFrom } = await createProjectSchema.validateAsync(
      req.body,
      {
        stripUnknown: true,
      }
    );

    let project: Project | undefined;

    await checkProjectLimit({ req });

    if (templateId) {
      // create project from resource blocklet
      if (blockletDid) {
        const resource = await getProjectFromResource({ projectId: templateId, type: ['template', 'example'] });

        if (resource) {
          project = await createProjectFromTemplate(resource, {
            name,
            description,
            author: req.user!,
            withDuplicateFrom,
          });
        }
      }

      // duplicate a project
      if (!project) {
        const original = await Project.findOne({ where: { id: templateId } });
        if (original) {
          project = await copyProject({
            project: original,
            name,
            description,
            author: req.user!,
            projectType: undefined,
          });
        }
      }

      // create project from builtin templates
      if (!project) {
        const template = projectTemplates.find((i) => i.project.id === templateId);
        if (template) {
          project = await createProjectFromTemplate(
            { ...template, assistants: [] },
            { name, description, author: req.user! }
          );
        }
      }

      if (!project) {
        throw new Error(`No such template project ${templateId}`);
      }
    } else {
      project = await Project.create({
        createdBy: did,
        updatedBy: did,
        gitDefaultBranch: defaultBranch,
        name,
        description,
      });
    }

    res.json(project);
  });

  router.post('/projects/import', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    await checkProjectLimit({ req });

    const { name, username, password, description, url } = await importProjectSchema.validateAsync(req.body, {
      stripUnknown: true,
    });
    const { did } = req.user!;

    const uri = new URL(url);
    if (password) {
      if (username) uri.username = username;
      if (password) uri.password = password;
    }

    let originProject: ProjectSettings | undefined;
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
        originProject = await projectSettingsSchema.validateAsync(
          parse(Buffer.from((await git.readBlob({ fs, gitdir, oid, filepath: '.settings.yaml' })).blob).toString())
        );
      }

      if (!originProject?.id)
        throw new Error('The project ID does not exist; only ai-studio projects can be imported.');

      const oldProject = await Project.findOne({ where: { id: originProject?.id } });
      if (oldProject)
        throw new Error(
          `The project(${oldProject.name}) already exists and cannot be imported. Please delete the existing project and try again.`
        );

      const projectId: string = originProject?.id;

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
        id: projectId,
        gitUrl: urlWithoutPassword.toString(),
        gitDefaultBranch: originDefaultBranch,
        createdBy: did,
        updatedBy: did,
        name,
        gitAutoSync: !!password,
        gitLastSyncedAt: new Date(),
        description,
      });

      res.json(project);
    } finally {
      await rm(tempFolder, { recursive: true, force: true });
    }
  });

  router.patch('/projects/:projectId', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required parameter `projectId`');

    const project = await Project.findOne({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ error: 'No such project' });
      return;
    }

    checkProjectPermission({ req, project });

    const { pinned, gitType, gitAutoSync, didSpaceAutoSync } = await updateProjectSchema.validateAsync(req.body, {
      stripUnknown: true,
    });

    if (gitAutoSync) {
      const repo = await getRepository({ projectId });
      const remote = (await repo.listRemotes()).find((i) => i.remote === defaultRemote);
      if (!remote) throw new Error('The remote has not been set up yet');
      if (!parseAuth(parseURL(remote.url).auth).password)
        throw new Error('Automatic synchronization must use an access token');
    }

    const { did: userId, fullName } = req.user!;

    project.changed('updatedAt', true);
    await project.update(
      omitBy(
        {
          pinnedAt: pinned ? new Date().toISOString() : pinned === false ? null : undefined,
          updatedBy: userId,
          gitType,
          gitAutoSync,
          didSpaceAutoSync,
          updatedAt: new Date(),
        },
        (v) => v === undefined
      )
    );

    const author = { name: fullName, email: userId };

    await autoSyncIfNeeded({ project, author, userId });

    res.json(project.dataValues);
  });

  router.delete('/projects/:projectId', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await Project.findOne({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ error: 'No such project' });
      return;
    }

    checkProjectPermission({ req, project });

    await project.destroy();

    await clearRepository(projectId);

    const root = repositoryRoot(projectId);
    await Promise.all([
      rm(root, { recursive: true, force: true }),
      rm(`${root}.cooperative`, { recursive: true, force: true }),
    ]);

    res.json(project);
  });

  router.post('/projects/:projectId/remote', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

    checkProjectPermission({ req, project });

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

  router.delete('/projects/:projectId/remote', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

    checkProjectPermission({ req, project });

    const repository = await getRepository({ projectId });

    await repository.deleteRemote({ remote: defaultRemote });

    await project.update({ gitUrl: null! });

    res.json({});
  });

  router.post('/projects/:projectId/remote/push', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const input = await pushInputSchema.validateAsync(req.body, { stripUnknown: true });

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

    checkProjectPermission({ req, project });

    const repository = await getRepository({ projectId });
    const branches = await repository.listBranches();

    for (const ref of branches) {
      await repository.push({ remote: defaultRemote, ref, force: input.force });
    }

    await project.update({ gitLastSyncedAt: new Date() }, { silent: true });

    res.json({});
  });

  router.post('/projects/:projectId/remote/pull', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { did: userId, fullName } = req.user!;

    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const input = await pullInputSchema.validateAsync(req.body, { stripUnknown: true });

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

    checkProjectPermission({ req, project });

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

    await project.update({ gitLastSyncedAt: new Date() }, { silent: true });

    res.json({});
  });

  router.post('/projects/:projectId/remote/sync', user(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { did: userId, fullName } = req.user!;

    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

    checkProjectPermission({ req, project });

    const repository = await getRepository({ projectId });

    const target: SyncTarget = req.query.target as SyncTarget;
    if (target === 'didSpace') {
      await syncToDidSpace({ project, userId });

      return res.json({});
    }

    if (target === 'github') {
      const remote = (await repository.listRemotes()).find((i) => i.remote === defaultRemote);
      if (!remote) throw new Error('The remote has not been set up yet');
      if (!parseAuth(parseURL(remote.url).auth).password) throw new Error('Synchronization must use an access token');

      const branches = await repository.listBranches();
      for (const ref of branches) {
        // eslint-disable-next-line no-await-in-loop
        await syncRepository({ repository, ref, author: { name: fullName, email: userId } });
      }

      return res.json({});
    }

    throw new Error(`Could not back up to target(${target})`);
  });

  router.get('/projects/:projectId/refs/:ref/assistants/:agentId', async (req, res) => {
    const { projectId, ref, agentId } = req.params;
    const query = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

    await Project.findByPk(projectId, { rejectOnEmpty: new Error(`Project ${projectId} not found`) });

    const repository = await getRepository({ projectId });

    const assistant = await getAssistantFromRepository({
      repository,
      ref,
      agentId,
      working: query.working,
    });

    res.json(
      pick(
        assistant,
        'id',
        'name',
        'description',
        'type',
        'parameters',
        'outputVariables',
        'createdAt',
        'updatedAt',
        'release',
        'entries',
        'createdBy'
      )
    );
  });

  router.get(
    '/projects/:projectId/refs/:ref/agents/:agentId',
    ensureComponentCallOrPromptsAdmin(),
    async (req, res) => {
      const { projectId, ref, agentId } = req.params;
      if (!projectId || !ref || !agentId) throw new Error('Missing required params `projectId`, `ref`, `agentId`');

      const query = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

      const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error(`Project ${projectId} not found`) });

      const repo = await getRepository({ projectId });

      const working = await repo.working({ ref });
      const settings = working.syncedStore.files[SETTINGS_FILE];

      const agent = await getAssistantFromRepository({
        repository: repo,
        ref,
        agentId,
        working: query.working,
      });

      res.json({ agent, project: { ...project.dataValues, ...(working ? settings : {}) } });
    }
  );

  router.get(
    '/projects/:projectId/refs/:ref/memory/variables',
    ensureComponentCallOrPromptsAdmin(),
    async (req, res) => {
      const { projectId, ref } = req.params;
      if (!projectId || !ref) throw new Error('Missing required params `projectId`, `ref`');

      const query = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

      await Project.findByPk(projectId, { rejectOnEmpty: new Error(`Project ${projectId} not found`) });

      const repo = await getRepository({ projectId });

      const variables = await getProjectMemoryVariables({
        repository: repo,
        ref,
        working: query.working,
      });

      res.json({ variables: variables?.variables ?? [] });
    }
  );

  router.get(
    '/projects/compare/:projectId/:ref/:agentId',
    user(),
    ensureComponentCallOrPromptsEditor(),
    async (req, res) => {
      const { projectId, ref, agentId } = req.params;
      if (!projectId || !ref || !agentId) throw new Error('Missing required params projectId/ref/agentId');

      const query = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

      await Project.findByPk(projectId, { rejectOnEmpty: new Error(`Project ${projectId} not found`) });

      const repository = await getRepository({ projectId });

      const assistant = await getAssistantFromRepository({
        repository,
        ref,
        agentId,
        working: query.working,
      });

      res.json(assistant);
    }
  );

  router.post('/projects/export/:projectId/:ref', ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { resources, projectId, ref } = await exportSchema.validateAsync(req.body, { stripUnknown: true });

    const assistants = (
      await Promise.all(
        resources.map(async (filepath: string) => {
          const agentId = getAssistantIdFromPath(filepath);
          if (!agentId) return [];
          const repository = await getRepository({ projectId });
          const p = (await repository.listFiles({ ref })).find((i) => i.endsWith(`${agentId}.yaml`));
          const parent = p ? p.split('/').slice(0, -1) : [];
          const result = await getAssistantFromRepository({ repository, ref, agentId });
          return { ...result, parent };
        })
      )
    ).flat();

    return res.json({ assistants: uniqBy(assistants, 'id') });
  });

  const uploadAssetSchema = Joi.object<{ type: 'logo' | 'asset'; source: string }>({
    type: Joi.string().valid('logo', 'asset').empty(['', null]).default('asset'),
    source: Joi.string().required(),
  });

  router.post(
    '/projects/:projectId/refs/:ref/assets',
    user(),
    ensureComponentCallOrPromptsEditor(),
    async (req, res) => {
      const { projectId, ref } = req.params;
      if (!projectId || !ref) throw new Error('Missing required params `projectId` or `ref`');

      const input = await uploadAssetSchema.validateAsync(req.body, { stripUnknown: true });

      const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

      checkProjectPermission({ req, project });

      const repo = await ProjectRepo.load({ projectId });
      const { filename, hash } = await repo.uploadAsset({ type: input.type, ref, source: input.source });

      res.json({ filename, hash });
    }
  );

  router.get('/projects/:projectId/refs/:ref/assets/:filename', async (req, res) => {
    const { projectId, ref, filename } = req.params;
    if (!projectId || !ref || !filename) throw new Error('Missing required params `projectId` or `ref` or `filename`');

    await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

    const repo = await ProjectRepo.load({ projectId });
    const working = await repo.working({ ref });

    const p = join(working.workingDir, ASSETS_DIR, filename);
    if (await exists(p)) {
      return res.sendFile(p);
    }

    return res.status(404).end();
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
  author,
  ...patch
}: {
  project: Project;
  author: { fullName: string; did: string };
} & Partial<Project['dataValues']>) {
  const repo = await getRepository({ projectId: original.id! });
  await repo.flush();

  const project = await Project.create({
    ...omit(original.dataValues, 'createdAt', 'updatedAt'),
    id: nextProjectId(),
    duplicateFrom: original.id,
    name: patch.name || (original.name && `${original.name}-copy`),
    createdBy: author.did,
    updatedBy: author.did,
    ...patch,
  });

  const parent = dirname(repo.root);
  await copyRecursive(repo.root, join(parent, project.id!));
  if (await exists(`${repo.root}.cooperative`)) {
    await copyRecursive(`${repo.root}.cooperative`, join(parent, `${project.id}.cooperative`));
  }

  return project;
}

async function createProjectFromTemplate(
  template: Omit<(typeof projectTemplates)[number], 'project'> & {
    project: Omit<(typeof projectTemplates)[number]['project'], 'createdAt' | 'updatedAt'>;
    assetsDir?: string;
    gitLogoPath?: string;
  },
  {
    name,
    description,
    author,
    withDuplicateFrom,
  }: {
    name?: string;
    description?: string;
    author: { fullName: string; did: string };
    withDuplicateFrom?: boolean;
  }
) {
  const project = await Project.create({
    ...omit(template.project, 'name', 'files', 'createdAt', 'updatedAt', 'pinnedAt'),
    id: nextProjectId(),
    duplicateFrom: withDuplicateFrom ? template.project.id : undefined,
    createdBy: author.did,
    updatedBy: author.did,
    gitDefaultBranch: template.project.gitDefaultBranch || defaultBranch,
    name,
    description,
  });

  const repository = await getRepository({
    projectId: project.id!,
    author: { name: author.fullName, email: author.did },
  });

  const working = await repository.working({ ref: defaultBranch });

  for (const { parent, ...file } of template.assistants) {
    const id = file.id || nextAssistantId();
    const assistant = fileToYjs({ ...file, id });

    if (isAssistant(assistant) && assistant.release?.logo) {
      const { logo } = assistant.release;
      if ((await exists(logo)) && isAbsolute(logo)) {
        const result = await uploadImageToImageBin({
          filename: basename(logo),
          data: { b64Json: await readFile(logo, { encoding: 'base64' }) },
          userId: author.did,
        });
        assistant.release.logo = result.url;
      }
    }

    working.syncedStore.files[id] = assistant;
    working.syncedStore.tree[id] = parent.concat(`${id}.yaml`).join('/');
  }

  working.syncedStore.tree[VARIABLE_KEY] = joinURL(CONFIG_FOLDER, VARIABLE_FILENAME);
  working.syncedStore.files[VARIABLE_KEY] = {
    type: 'variables',
    variables: (template.memory?.variables ?? []).map(variableToYjs),
  };
  working.syncedStore.tree[CONFIG_FILE_KEY] = joinURL(CONFIG_FOLDER, CONFIG_FILENAME);
  working.syncedStore.files[CONFIG_FILE_KEY] = template.config || {};

  const assetsDir = join(working.workingDir, 'assets/');
  await mkdir(assetsDir, { recursive: true });
  if (template.assetsDir && (await exists(template.assetsDir))) {
    await copyRecursive(join(template.assetsDir, '/'), assetsDir);
  }

  await repository.commitWorking({
    ref: defaultBranch,
    branch: defaultBranch,
    message: 'First Commit',
    author: { name: author.fullName, email: author.did },
    icon: template?.gitLogoPath || (await sampleIcon()),
  });

  return project;
}
