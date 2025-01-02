import type { ResourceProject } from '@blocklet/ai-runtime/types';

import { wallet } from '../libs/auth';

export const projectTemplates: (Partial<ResourceProject> & Required<Pick<ResourceProject, 'project'>>)[] = [
  {
    project: {
      id: '363299428078977024',
      name: 'blank',
      description: 'Start a project from scratch.',
      createdBy: wallet.address,
      updatedBy: wallet.address,
      createdAt: '2023-09-30T12:23:04.603Z',
      updatedAt: '2023-09-30T12:23:04.603Z',
    },
    agents: [],
  },
];
