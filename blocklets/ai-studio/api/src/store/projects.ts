import path from 'path';

import Database from '@blocklet/sdk/lib/database';

import env from '../libs/env';
import Repository from './repository';

export interface Project {
  _id?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy: string;
  updatedBy: string;
}

export default class Projects extends Database<Project> {
  constructor() {
    super('projects');
  }
}

export const projects = new Projects();

export const getRepository = (projectId: string = 'default') =>
  new Repository(path.join(env.dataDir, 'repositories', projectId));
