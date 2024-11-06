import { join } from 'path';

import { Config } from '@api/libs/env';
import Project from '@api/store/models/project';
import { OLD_PROJECT_FILE_PATH, PROJECT_FILE_PATH, ProjectRepo, defaultBranch } from '@api/store/repository';
import { projectSettingsSchema } from '@blocklet/ai-runtime/types';
import { ListObjectCommand, SpaceClient, SyncFolderPullCommand } from '@blocklet/did-space-js';
import { Request, Response } from 'express';
import Joi from 'joi';
import yaml from 'yaml';

import { wallet } from '../../libs/auth';
import { checkProjectLimit } from '../project';

const importProjectBodySchema = Joi.object<{
  endpoint: string;
  projectId: string;
  props: Pick<Project, 'name' | 'description'>;
}>({
  endpoint: Joi.string()
    .uri({ scheme: ['https', 'http'] })
    .required(),
  projectId: Joi.string().required(),
  props: Joi.object({
    name: Joi.string().required(),
    description: Joi.string().optional().allow('', null).default(''),
  }).required(),
});

export async function importProject(req: Request, res: Response) {
  await checkProjectLimit({ req });

  const { endpoint, projectId, props } = await importProjectBodySchema.validateAsync(req.body);

  const spaceClient = new SpaceClient({
    wallet,
    endpoint,
  });
  const remoteProjectRootPath: string = `repositories/${projectId}/`;
  const {
    data: { metadata: projectMetadata },
  } = await spaceClient.send(
    new ListObjectCommand({
      key: remoteProjectRootPath,
    })
  );

  const metadata = await projectSettingsSchema.validateAsync(projectMetadata);

  if (!metadata.id) throw new Error('The project ID does not exist; only ai-studio projects can be imported.');
  const oldProject = await Project.findOne({ where: { id: metadata.id } });
  if (oldProject) {
    throw new Error(
      `The project(${oldProject.name}) already exists and cannot be imported. Please delete the existing project and try again.`
    );
  }

  const localeProjectRootPath: string = join(Config.dataDir, `repositories/${projectId}/`);
  const remoteProjectCooperativeRootPath: string = `repositories/${projectId}.cooperative`;
  const localeProjectCooperativeRootPath: string = join(Config.dataDir, `repositories/${projectId}.cooperative/`);
  const outputs = await Promise.all([
    spaceClient.send(
      new SyncFolderPullCommand({
        source: remoteProjectRootPath,
        target: localeProjectRootPath,
      })
    ),
    spaceClient.send(
      new SyncFolderPullCommand({
        source: remoteProjectCooperativeRootPath,
        target: localeProjectCooperativeRootPath,
      })
    ),
  ]);
  // 如果有错误则抛出
  const errorOutput = outputs.filter(Boolean).find((output) => output?.statusCode !== 200);
  if (errorOutput) {
    throw new Error(errorOutput.statusMessage);
  }

  const repo = await ProjectRepo.load({ projectId: metadata.id });

  const branches = await repo.listBranches();
  const branch = branches.includes(defaultBranch) ? defaultBranch : branches[0]!;

  const settings = await projectSettingsSchema.validateAsync(
    yaml.parse(
      Buffer.from(
        (
          await repo
            .readBlob({ ref: branch, filepath: PROJECT_FILE_PATH })
            .catch(() => repo.readBlob({ ref: branch, filepath: OLD_PROJECT_FILE_PATH }))
        ).blob
      ).toString()
    )
  );

  const { did } = req.user!;

  const project = await Project.create({
    ...settings,
    ...metadata,
    ...props,
    createdAt: metadata.createdAt || (settings.createdAt as any),
    updatedAt: metadata.updatedAt || (settings.updatedAt as any),
    gitDefaultBranch: defaultBranch,
    // rewrite some auth
    createdBy: did,
    updatedBy: did,
  });

  return res.send(project);
}
