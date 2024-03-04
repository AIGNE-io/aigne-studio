import { Assistant } from '@blocklet/ai-runtime/types';

import { wallet } from '../libs/auth';
import Project from '../store/models/project';

export const projectTemplates: (Project['dataValues'] & {
  files: (Assistant & { parent: string[] })[];
})[] = [
  {
    _id: '363299428078977024',
    name: 'blank',
    description: 'Start a project from scratch.',
    model: '',
    gitDefaultBranch: 'main',
    createdBy: wallet.address,
    updatedBy: wallet.address,
    createdAt: new Date('2023-09-30T12:23:04.603Z'),
    updatedAt: new Date('2023-09-30T12:23:04.603Z'),
    files: [
      {
        parent: ['prompts'],
        id: '',
        type: 'prompt',
        name: 'Hello World',
        prompts: [
          {
            type: 'message',
            data: {
              id: '20231208131000-LgzRpn',
              content: 'Say hello in {{language}}!',
              role: 'user',
            },
          },
        ],
        parameters: [
          {
            id: '1701840448533',
            key: 'language',
            defaultValue: 'English',
          },
        ],
        createdBy: wallet.address,
        updatedBy: wallet.address,
        createdAt: '2023-09-30T12:23:04.603Z',
        updatedAt: '2023-09-30T12:23:04.603Z',
      },
    ],
  },
];
