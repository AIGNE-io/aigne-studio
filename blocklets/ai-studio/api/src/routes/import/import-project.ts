import { readFileSync } from 'fs';
import { join } from 'path';

import { Config } from '@api/libs/env';
import Project from '@api/store/models/project';
import { SETTINGS_FILE } from '@api/store/repository';
import { ListObjectCommand, SpaceClient, SyncFolderPullCommand } from '@did-space/client';
import { Request, Response } from 'express';
import yaml from 'yaml';

import { wallet } from '../../libs/auth';

export async function importProject(req: Request, res: Response) {
  const { endpoint, projectId, props } = req.body;

  const spaceClient = new SpaceClient({
    wallet,
    // @ts-ignore
    endpoint,
  });

  const remoteProjectRootPath: string = `repositories/${projectId}/`;
  const localeProjectRootPath: string = join(Config.dataDir, `repositories/${projectId}/`);

  const { metadata: projectMetadata } = await spaceClient.send(
    new ListObjectCommand({
      key: remoteProjectRootPath,
    })
  );
  if (!projectMetadata?._id) throw new Error('The project ID does not exist; only ai-studio projects can be imported.');
  const oldProject = await Project.findOne({ where: { _id: projectMetadata?._id } });
  if (oldProject)
    throw new Error(
      `The project(${oldProject.name}) already exists and cannot be imported. Please delete the existing project and try again.`
    );

  const output = await spaceClient.send(
    new SyncFolderPullCommand({
      source: remoteProjectRootPath,
      target: localeProjectRootPath,
    })
  );

  if (!output) {
    throw new Error('ok');
  }
  const remoteProjectCooperativeRootPath: string = `repositories/${projectId}.cooperative`;
  const localeProjectCooperativeRootPath: string = join(Config.dataDir, `repositories/${projectId}.cooperative/`);
  await spaceClient.send(
    new SyncFolderPullCommand({
      source: remoteProjectCooperativeRootPath,
      target: localeProjectCooperativeRootPath,
    })
  );

  const settingsPath = join(localeProjectRootPath, SETTINGS_FILE);
  const settings: Project = yaml.parse(readFileSync(settingsPath, 'utf-8'));

  const project = await Project.create({
    ...settings,
    ...projectMetadata,
    ...props,
  });

  return res.send(project);
}
