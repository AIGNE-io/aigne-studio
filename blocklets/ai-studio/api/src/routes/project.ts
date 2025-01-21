import fs from 'fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { basename, dirname, isAbsolute, join } from 'path';

import { Runtime } from '@aigne/runtime';
import { generateWrapperCode } from '@aigne/runtime/cmd';
import { projectCronManager } from '@api/libs/cron-jobs';
import { Config } from '@api/libs/env';
import { NoPermissionError, NotFoundError } from '@api/libs/error';
import { sampleIcon } from '@api/libs/icon';
import { uploadImageToImageBin } from '@api/libs/image-bin';
import AgentInputSecret from '@api/store/models/agent-input-secret';
import ProjectExtra from '@api/store/models/project-extra';
import type { MemoryFile, ProjectSettings, ResourceProject } from '@blocklet/ai-runtime/types';
import {
  RuntimeError,
  RuntimeErrorType,
  fileToYjs,
  isAssistant,
  nextAssistantId,
  projectSettingsSchema,
  variableToYjs,
} from '@blocklet/ai-runtime/types';
import { copyRecursive } from '@blocklet/ai-runtime/utils/fs';
import { getUserPassports, quotaChecker } from '@blocklet/aigne-sdk/api/premium';
import { AIGNE_RUNTIME_COMPONENT_DID, NFT_BLENDER_COMPONENT_DID } from '@blocklet/aigne-sdk/constants';
import type { Map } from '@blocklet/co-git/yjs';
import { getYjsValue } from '@blocklet/co-git/yjs';
import { call } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import { auth, session } from '@blocklet/sdk/lib/middlewares';
import type { SessionUser } from '@blocklet/sdk/lib/util/login';
import type { Request, Router } from 'express';
import { exists } from 'fs-extra';
import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import Joi from 'joi';
import isNil from 'lodash/isNil';
import omit from 'lodash/omit';
import omitBy from 'lodash/omitBy';
import pick from 'lodash/pick';
import uniqBy from 'lodash/uniqBy';
import { nanoid } from 'nanoid';
import * as tar from 'tar';
import { parseAuth, parseURL } from 'ufo';
import { parse } from 'yaml';

import { resourceManager } from '../libs/resource';
import {
  ensureComponentCallOrPromptsAdmin,
  ensureComponentCallOrPromptsEditor,
  ensureComponentCallOrRolesMatch,
} from '../libs/security';
import Project, { nextProjectId } from '../store/models/project';
import {
  ASSETS_DIR,
  CONFIG_FILE_PATH,
  COPY_REPO_FILES,
  CRON_FILE_PATH,
  LOGO_FILENAME,
  OLD_PROJECT_FILE_PATH,
  PROJECT_FILE_PATH,
  ProjectRepo,
  VARIABLE_FILE_PATH,
  autoSyncIfNeeded,
  defaultBranch,
  defaultRemote,
  getAssistantIdFromPath,
  getRepository,
  repositoryRoot,
  syncRepository,
  syncToDidSpace,
} from '../store/repository';
import { projectTemplates } from '../templates/projects';
import { checkDeployment } from './deployment';
import { getCommits } from './log';

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
    aigneBannerVisible?: boolean;
  };
}

const updateProjectSchema = Joi.object<UpdateProjectInput>({
  name: Joi.string().allow('').empty([null]).optional(),
  description: Joi.string().allow('').empty([null]).optional(),
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
    aigneBannerVisible: Joi.boolean().empty([null]),
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
  if (config.env.tenantMode === 'multiple') {
    // check project count limit
    const count = await Project.count({ where: { createdBy: req.user?.did } });
    // `+1`: 把正在创建的项目 (未存储到数据库) 也算在内
    const used = count + 1;
    if (
      !ensureComponentCallOrRolesMatch(req, Config.serviceModePermissionMap.ensurePromptsAdminRoles) &&
      !quotaChecker.checkProjectLimit(used, await getUserPassports(req.user?.did))
    ) {
      throw new RuntimeError(
        RuntimeErrorType.ProjectLimitExceededError,
        `Project limit exceeded (current: ${count}, limit: ${quotaChecker.getQuota('projectLimit', req.user?.role)})`
      );
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
  router.get('/projects', session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const list = await Project.findAll({
      where: { ...getProjectWhereConditions(req) },
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
        const projectSetting = working.syncedStore.files[PROJECT_FILE_PATH] as ProjectSettings | undefined;

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

    // multi-tenant mode
    if (config.env.tenantMode === 'multiple') {
      res.json({
        templates: [],
        examples: [],
        projects,
      });
      return;
    }

    // single-tenant mode
    res.json({
      templates: [],
      examples: [],
      projects,
    });
  });

  const checkProjectNameSchema = Joi.object<{ name: string; projectId: string }>({
    name: Joi.string().required(),
    projectId: Joi.string().empty([null, '']),
  });

  router.get('/projects/check-name', session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { name, projectId } = await checkProjectNameSchema.validateAsync(req.query, { stripUnknown: true });
    const projects = await Project.findAll({ where: { name, createdBy: req.user?.did } });

    if (!projectId) {
      res.json({ ok: projects.length === 0, project: projects?.[0] });
      return;
    }

    const filtered = projects.filter((i) => i.id !== projectId);
    res.json({ ok: filtered.length === 0, project: filtered?.[0] });
  });

  router.get('/projects/count', session(), async (req, res) => {
    const count = await Project.count({ where: { createdBy: req.user?.did } });
    res.json({ count });
  });

  router.get('/template-projects', session(), ensureComponentCallOrPromptsEditor(), async (_req, res) => {
    const resourceTemplates = (await resourceManager.getProjects({ type: 'template' })).map((i) => ({
      ...i.project,
      blockletDid: i.blocklet.did,
    }));

    res.json({ templates: uniqBy([...resourceTemplates], (i) => i.id) });
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
      const resource = await resourceManager.getProject({ blockletDid: query.blockletDid, projectId });

      const logoPath = resource?.dir && join(resource.dir, LOGO_FILENAME);
      if (logoPath && (await exists(logoPath))) {
        res.sendFile(logoPath);
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

  router.get('/projects/:projectId', session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required param `projectId`');

    const query = await getProjectQuerySchema.validateAsync(req.query, { stripUnknown: true });

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new NotFoundError('No such project') });

    const repo = await ProjectRepo.load({ projectId });
    const settings = await repo.readAndParseFile<ProjectSettings>({
      filepath: PROJECT_FILE_PATH,
      ref: query.projectRef || project.gitDefaultBranch,
      working: query.working,
    });

    checkProjectPermission({ req, project });

    res.json({ ...project.dataValues, ...settings });
  });

  router.get(
    '/projects/:projectId/agent-input-secrets',
    session(),
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

  router.get('/projects/:projectId/npm/package/secret', session(), auth(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required param `projectId`');

    const project = await Project.findOne({ where: { id: projectId }, rejectOnEmpty: new Error('No such project') });
    checkProjectPermission({ req, project });

    const extra = await ProjectExtra.findByPk(projectId);
    res.json({ secret: extra?.npmPackageSecret });
  });

  router.post('/projects/:projectId/npm/package/secret/generate', session(), auth(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required param `projectId`');

    const project = await Project.findOne({ where: { id: projectId }, rejectOnEmpty: new Error('No such project') });
    checkProjectPermission({ req, project });

    const [extra] = await ProjectExtra.upsert({ id: projectId, npmPackageSecret: nanoid() });
    res.json({ secret: extra.npmPackageSecret });
  });

  router.get('/projects/:projectId/npm/package.tgz', async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required param `projectId`');

    const secret = req.query.secret as string | undefined;
    const extra = await ProjectExtra.findByPk(projectId);

    if (!extra?.npmPackageSecret || secret !== extra.npmPackageSecret) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const project = await Project.findOne({ where: { id: projectId }, rejectOnEmpty: new Error('No such project') });
    const repo = await ProjectRepo.load({ projectId });

    const tmpDir = join(config.env.dataDir, 'tmp/npm/', nanoid());
    const packageDir = join(tmpDir, 'package');
    const tgzPath = join(tmpDir, 'package.tgz');
    try {
      await mkdir(packageDir, { recursive: true });

      await repo.checkout({ ref: project.gitDefaultBranch, dir: packageDir, force: true });

      // TODO: 把 load project 的逻辑提取到一个函数中，替换掉这里的代码
      const files = await generateWrapperCode((await Runtime.load({ path: packageDir })).options.projectDefinition!);

      for (const { fileName, content } of files) {
        await writeFile(join(packageDir, fileName), content);
      }

      await tar.create({ gzip: true, file: tgzPath, C: packageDir }, ['.']);

      await new Promise<void>((resolve, reject) => {
        res.sendFile(tgzPath, {}, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } finally {
      await rm(packageDir, { recursive: true, force: true });
    }
  });

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
    session(),
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

  router.post('/projects', session(), ensureComponentCallOrPromptsEditor(), checkDeployment, async (req, res) => {
    const {
      blockletDid,
      templateId = projectTemplates[0]?.project?.id,
      name,
      description,
      withDuplicateFrom,
    } = await createProjectSchema.validateAsync(req.body, { stripUnknown: true });

    let project: Project | undefined;

    await checkProjectLimit({ req });

    if (!templateId) {
      throw new Error('No template project found');
    }

    // create project from resource blocklet
    if (blockletDid) {
      const resource = await resourceManager.getProject({
        blockletDid,
        projectId: templateId,
        type: ['template', 'example'],
      });

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
          { ...template, agents: [] },
          { name, description, author: req.user! }
        );
      }
    }

    if (!project) {
      throw new Error(`No such template project ${templateId}`);
    }

    projectCronManager.reloadProjectJobs(project.id);

    res.json(project);
  });

  router.post('/projects/import', session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
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

    await mkdir(join(Config.dataDir, 'repositories'), { recursive: true });
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
          parse(
            Buffer.from(
              (
                await git
                  .readBlob({ fs, gitdir, oid, filepath: PROJECT_FILE_PATH })
                  .catch(() => git.readBlob({ fs, gitdir, oid, filepath: OLD_PROJECT_FILE_PATH }))
              ).blob
            ).toString()
          )
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

      const data = await projectSettingsSchema.validateAsync(
        parse(
          Buffer.from(
            (
              await repository
                .readBlob({
                  ref: originDefaultBranch!,
                  filepath: PROJECT_FILE_PATH,
                })
                .catch(() =>
                  repository.readBlob({
                    ref: originDefaultBranch!,
                    filepath: OLD_PROJECT_FILE_PATH,
                  })
                )
            ).blob
          ).toString()
        )
      );

      const project = await Project.create({
        ...omit(data, 'createdAt', 'updatedAt'),
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

  router.patch('/projects/:projectId', session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required parameter `projectId`');

    const project = await Project.findOne({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ error: 'No such project' });
      return;
    }

    checkProjectPermission({ req, project });

    const { pinned, gitType, gitAutoSync, didSpaceAutoSync, name, description } =
      await updateProjectSchema.validateAsync(req.body, {
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

    // 把 name 和 description 写到 yjs 文件中
    if (!isNil(name) || !isNil(description)) {
      const repository = await getRepository({ projectId });
      const working = await repository.working({ ref: project.gitDefaultBranch });
      const projectSetting = working.syncedStore.files[PROJECT_FILE_PATH] as ProjectSettings | undefined;
      if (projectSetting) {
        if (!isNil(name)) projectSetting.name = name;
        if (!isNil(description)) projectSetting.description = description;
      }
    }

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
          name,
          description,
        },
        (v) => v === undefined
      )
    );

    const author = { name: fullName, email: userId };

    await autoSyncIfNeeded({ project, author, userId });

    res.json(project.dataValues);
  });

  router.delete('/projects/:projectId', session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await Project.findOne({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ error: 'No such project' });
      return;
    }

    checkProjectPermission({ req, project });

    await project.destroy();
    projectCronManager.destroyProjectJobs(projectId);

    const repository = await getRepository({ projectId });
    await repository.destroy();

    const root = repositoryRoot(projectId);
    await Promise.all([
      rm(root, { recursive: true, force: true }),
      rm(`${root}.cooperative`, { recursive: true, force: true }),
    ]);

    res.json(project);
  });

  router.post('/projects/:projectId/remote', session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
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

  router.delete('/projects/:projectId/remote', session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

    checkProjectPermission({ req, project });

    const repository = await getRepository({ projectId });

    await repository.deleteRemote({ remote: defaultRemote });

    await project.update({ gitUrl: null! });

    res.json({});
  });

  router.post('/projects/:projectId/remote/push', session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
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

  router.post('/projects/:projectId/remote/pull', session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
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

  router.post('/projects/:projectId/remote/sync', session(), ensureComponentCallOrPromptsEditor(), async (req, res) => {
    const { did: userId, fullName } = req.user!;

    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const project = await Project.findByPk(projectId, { rejectOnEmpty: new Error('Project not found') });

    checkProjectPermission({ req, project });

    const repository = await getRepository({ projectId });

    const target: SyncTarget = req.query.target as SyncTarget;
    if (target === 'didSpace') {
      await syncToDidSpace({ project, userId });

      repository.resetCache();
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
        (await repository.working({ ref })).reset();
      }

      repository.resetCache();
      return res.json({});
    }

    throw new Error(`Could not back up to target(${target})`);
  });

  router.get('/projects/:projectId/refs/:ref/assistants/:agentId', async (req, res) => {
    const { projectId, ref, agentId } = req.params;
    const query = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

    await Project.findByPk(projectId, { rejectOnEmpty: new Error(`Project ${projectId} not found`) });

    const repository = await getRepository({ projectId });

    const assistant = await repository.readAgent({
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

      const repo = await getRepository({ projectId });

      const [agent, settings] = await Promise.all([
        repo.readAgent({
          ref,
          agentId,
          working: query.working,
          rejectOnEmpty: true,
          readBlobFromGitIfWorkingNotInitialized: true,
        }),
        repo.readAndParseFile({
          ref,
          filepath: PROJECT_FILE_PATH,
          working: query.working,
          rejectOnEmpty: true,
          readBlobFromGitIfWorkingNotInitialized: true,
        }),
      ]);

      res.json({
        agent,
        project: settings,
      });
    }
  );

  router.get(
    '/projects/:projectId/refs/:ref/memory/variables',
    ensureComponentCallOrPromptsAdmin(),
    async (req, res) => {
      const { projectId, ref } = req.params;
      if (!projectId || !ref) throw new Error('Missing required params `projectId`, `ref`');

      const query = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

      const repo = await getRepository({ projectId });

      const memoryFile = await repo.readAndParseFile<MemoryFile>({
        ref,
        filepath: VARIABLE_FILE_PATH,
        working: query.working,
        readBlobFromGitIfWorkingNotInitialized: true,
      });

      res.json({ variables: memoryFile?.variables ?? [] });
    }
  );

  router.get(
    '/projects/compare/:projectId/:ref/:agentId',
    session(),
    ensureComponentCallOrPromptsEditor(),
    async (req, res) => {
      const { projectId, ref, agentId } = req.params;
      if (!projectId || !ref || !agentId) throw new Error('Missing required params projectId/ref/agentId');

      const query = await getAgentQuerySchema.validateAsync(req.query, { stripUnknown: true });

      await Project.findByPk(projectId, { rejectOnEmpty: new Error(`Project ${projectId} not found`) });

      const repository = await getRepository({ projectId });

      const assistant = await repository.readAgent({
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
          const result = await repository.readAgent({ ref, agentId });

          (result?.parameters || []).forEach((parameter) => {
            if (parameter.type === 'source') {
              if (parameter?.source?.variableFrom === 'tool' && parameter?.source?.agent?.projectId) {
                parameter.source.agent.projectId = req.params.projectId;
              }

              if (parameter?.source?.variableFrom === 'blockletAPI' && parameter?.source?.api?.projectId) {
                parameter.source.api.projectId = req.params.projectId;
              }

              if (parameter?.source?.variableFrom === 'knowledge' && parameter?.source?.knowledge?.projectId) {
                parameter.source.knowledge.projectId = req.params.projectId;
              }
            }
          });

          if (result?.type === 'callAgent') {
            (result.agents || []).forEach((agent) => {
              if (agent?.projectId) {
                agent.projectId = req.params.projectId;
              }
            });
          }

          if (result?.type === 'router') {
            (result.routes || []).forEach((route) => {
              if (route?.projectId) {
                route.projectId = req.params.projectId;
              }
            });
          }

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
    session(),
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
  author: SessionUser;
} & Partial<Project['dataValues']>) {
  const srcRepo = await getRepository({ projectId: original.id! });
  const srcWorking = await srcRepo.working({ ref: original.gitDefaultBranch || defaultBranch });
  await srcWorking.save({ flush: true });

  const originalProjectYaml = srcWorking.syncedStore.files[PROJECT_FILE_PATH] as { name: string };

  const project = await Project.create({
    ...omit(original.dataValues, 'createdAt', 'updatedAt'),
    id: nextProjectId(),
    duplicateFrom: original.id,
    name:
      patch.name ||
      (originalProjectYaml?.name && `${originalProjectYaml?.name}-copy`) ||
      (original.name && `${original.name}-copy`),
    createdBy: author.did,
    updatedBy: author.did,
    ...omit(patch, 'name'),
    gitDefaultBranch: defaultBranch,
  });

  const repo = await getRepository({ projectId: project.id, author: { name: author.fullName, email: author.did } });

  const workingDir = join(dirname(repo.root), `${project.id}.cooperative/${defaultBranch}`);
  await copyRecursive(srcWorking.options.root, workingDir);

  const working = await repo.working({ ref: defaultBranch });

  for (const filepath of COPY_REPO_FILES) {
    working.syncedStore.files[filepath] ??= {};
    const file = working.syncedStore.files[filepath];

    Object.assign(file, (getYjsValue(srcWorking.syncedStore.files[filepath]) as Map<any>).toJSON());
  }

  const projectYaml = working.syncedStore.files[PROJECT_FILE_PATH];
  if (!projectYaml) throw new Error('Missing project.yaml in the copied project');
  Object.assign(projectYaml, await projectSettingsSchema.validateAsync(project.dataValues));

  await copyKnowledge({ originProjectId: original.id!, currentProjectId: project.id!, user: author });

  const agents = Object.values(working.syncedStore.files).filter((i) => !!i && isAssistant(i));
  for (const agent of agents) {
    if (agent.type === 'imageBlender' && agent.templateId) {
      // eslint-disable-next-line no-await-in-loop
      const { data } = await call({
        name: NFT_BLENDER_COMPONENT_DID,
        path: '/api/sdk/templates/copy-snapshot',
        method: 'POST',
        data: { templateId: agent.templateId, userDid: author.did, name: project.name },
      });
      if (!data?.templateId) {
        throw new Error('copy nft template failed');
      }

      agent.templateId = data.templateId;
    }
  }
  working.save({ flush: true });

  await repo.commitWorking({
    ref: defaultBranch,
    branch: defaultBranch,
    message: `Copy from ${original.name || original.id}`,
    author: { name: author.fullName, email: author.did },
  });

  return project;
}

async function copyKnowledge({
  originProjectId,
  currentProjectId,
  user,
}: {
  originProjectId: string;
  currentProjectId: string;
  user: SessionUser;
}) {
  const { data } = await call({
    name: AIGNE_RUNTIME_COMPONENT_DID,
    path: '/api/datasets',
    method: 'POST',
    params: { userId: user.did },
    data: { projectId: currentProjectId, copyFromProjectId: originProjectId },
  });

  const projectIdMap = Object.fromEntries(
    (data.copied || []).map((item: { from: { id: string }; to: { id: string } }) => {
      return [item.from.id, item.to.id];
    })
  );

  const repository = await getRepository({ projectId: currentProjectId });
  const working = await repository.working({ ref: defaultBranch });
  const agents = Object.values(working.syncedStore.files).filter((i) => !!i && isAssistant(i));

  for (const agent of agents) {
    const parameters = Object.values(agent.parameters || []).map((i) => i.data);
    for (const parameter of parameters || []) {
      if (parameter.key && parameter.type === 'source') {
        if (parameter.source?.variableFrom === 'knowledge' && parameter.source.knowledge) {
          const tool = parameter.source.knowledge;
          const oldKnowledgeBaseId = tool.id;

          if (projectIdMap[oldKnowledgeBaseId]) {
            parameter.source.knowledge.id = projectIdMap[oldKnowledgeBaseId];
            parameter.source.knowledge.projectId = currentProjectId;
          }
        }
      }
    }
  }

  working.save({ flush: true });
}
async function createProjectFromTemplate(
  template: Partial<ResourceProject>,
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
    duplicateFrom: withDuplicateFrom ? template.project?.id : undefined,
    createdBy: author.did,
    updatedBy: author.did,
    gitDefaultBranch: defaultBranch,
    name,
    description,
  });

  const repository = await getRepository({
    projectId: project.id!,
    author: { name: author.fullName, email: author.did },
  });

  const working = await repository.working({ ref: defaultBranch });

  for (const { parent, ...file } of template.agents ?? []) {
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

  working.syncedStore.tree[VARIABLE_FILE_PATH] = VARIABLE_FILE_PATH;
  working.syncedStore.files[VARIABLE_FILE_PATH] = {
    variables: (template.memory?.variables ?? []).map(variableToYjs),
  };

  working.syncedStore.tree[CONFIG_FILE_PATH] = CONFIG_FILE_PATH;
  working.syncedStore.files[CONFIG_FILE_PATH] = template.config || {};

  working.syncedStore.tree[CRON_FILE_PATH] = CRON_FILE_PATH;
  working.syncedStore.files[CRON_FILE_PATH] = template.cron || {};

  const assetsDir = join(working.workingDir, 'assets/');
  await mkdir(assetsDir, { recursive: true });
  const templateAssetsDir = template.dir && join(template.dir, 'assets/');
  if (templateAssetsDir && (await exists(templateAssetsDir))) {
    await copyRecursive(templateAssetsDir, assetsDir);
  }

  const iconPath = template.dir && join(template.dir, LOGO_FILENAME);

  await repository.commitWorking({
    ref: defaultBranch,
    branch: defaultBranch,
    message: 'First Commit',
    author: { name: author.fullName, email: author.did },
    icon: iconPath && (await exists(iconPath)) ? iconPath : await sampleIcon(),
  });

  return project;
}
