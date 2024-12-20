import { join } from 'path';

import { readFile } from 'fs-extra';
import { glob } from 'glob';
import { parse } from 'yaml';

import { Agent, Variable } from '../types';

export interface AIGNEProject {
  id: string;
  name?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;

  agents?: Agent[];

  memories?: Variable[];
}

export class AIGNERuntime {
  static async load(options: { path: string }) {
    const projectFilePath = join(options.path, 'project.yaml');
    const project = parse((await readFile(projectFilePath)).toString());
    // TODO: validate parsed project

    const agentFilePaths = await glob(join(options.path, 'prompts', '**/*.yaml'));
    const agents = await Promise.all(
      agentFilePaths.map(async (filename) => {
        const agent = parse((await readFile(filename)).toString());
        // TODO: validate parsed agent

        return agent;
      })
    );

    const memoryFilePath = join(options.path, 'config/variable.yaml');
    const memories = parse((await readFile(memoryFilePath)).toString())?.variables;
    // TODO: validate parsed memories

    const p: AIGNEProject = {
      ...project,
      agents,
      memories,
    };

    return new AIGNERuntime(p);
  }

  constructor(public project: AIGNEProject) {}

  get id() {
    return this.project.id;
  }

  get name() {
    return this.project.name;
  }
}
