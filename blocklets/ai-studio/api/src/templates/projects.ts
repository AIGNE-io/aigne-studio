import { Assistant, ConfigFile, Variable } from '@blocklet/ai-runtime/types';

import { wallet } from '../libs/auth';
import Project from '../store/models/project';

export const projectTemplates: {
  project: Partial<Project['dataValues']>;
  assistants: (Assistant & { parent: string[] })[];
  config?: Partial<ConfigFile>;
  memory?: { variables?: Variable[] };
}[] = [
  {
    project: {
      id: '363299428078977024',
      name: 'blank',
      description: 'Start a project from scratch.',
      gitDefaultBranch: 'main',
      createdBy: wallet.address,
      updatedBy: wallet.address,
      createdAt: new Date('2023-09-30T12:23:04.603Z'),
      updatedAt: new Date('2023-09-30T12:23:04.603Z'),
    },
    assistants: [],
  },
];
