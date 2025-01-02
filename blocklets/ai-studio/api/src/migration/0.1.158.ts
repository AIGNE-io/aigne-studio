import path from 'path';

import type { AssistantYjs } from '@blocklet/ai-runtime/types';
import { sortBy } from 'lodash';
import { customAlphabet } from 'nanoid';

import { wallet } from '../libs/auth';
import logger from '../libs/logger';
import { getRepository, isTemplate } from '../store/0.1.157/projects';
import { isPromptMessage } from '../store/0.1.157/templates';
import Project from '../store/models/project';

const { name } = require('../../../package.json');

const version = path.parse(__filename).name;

export const randomId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

async function migrate() {
  const projects = await Project.findAll();

  await Promise.all(
    projects.map(async (project) => {
      const repo = await getRepository({ projectId: project.id });

      const branches = await repo.listBranches();

      for (const branch of branches) {
        try {
          const working = await repo.working({ ref: branch });

          const files = Object.values(working.syncedStore.files);

          for (const f of files) {
            if (f && isTemplate(f)) {
              const file: typeof f = JSON.parse(JSON.stringify(f));

              const newFile: AssistantYjs = {
                id: file.id,
                type: 'prompt',
                name: file.name,
                parameters:
                  file.parameters &&
                  Object.fromEntries(
                    Object.entries(file.parameters)
                      .filter(([, parameter]) => !!parameter)
                      .map(([key, i], index) => {
                        const id = randomId();

                        return [id, { index, data: { id, key, ...(i.type === 'horoscope' ? undefined : i) } }];
                      })
                  ),
                description: file.description,
                prompts:
                  file.prompts &&
                  Object.fromEntries(
                    sortBy(Object.values(file.prompts), (i) => i.index)
                      .map((i) => i.data)
                      .filter(isPromptMessage)
                      .map((prompt, index) => [
                        prompt.id,
                        {
                          index,
                          data: {
                            type: 'message',
                            data: {
                              id: prompt.id,
                              role: prompt.role || 'user',
                              content: prompt.content,
                            },
                            visibility: prompt.visibility,
                          },
                        },
                      ])
                  ),
                createdAt: file.createdAt,
                updatedAt: file.updatedAt,
                createdBy: file.createdBy,
                updatedBy: file.updatedBy,
                tests: file.tests,
                tags: file.tags,
                temperature: file.temperature,
                topP: file.topP,
                presencePenalty: file.presencePenalty,
                frequencyPenalty: file.frequencyPenalty,
                maxTokens: file.maxTokens,
                model: file.model,
              };

              working.syncedStore.files[file.id] = newFile as any;
            }
          }

          working.save({ flush: true });

          await working.commit({
            ref: branch,
            branch,
            message: 'Migrate to v0.1.158',
            author: { name: 'AI Studio', email: wallet.address },
          });
        } catch (error) {
          logger.error(`Migration to ${version} error`, { error });
        }
      }
    })
  );
}

(async () => {
  try {
    await migrate();
    logger.info(`migration ${version} success`);
    process.exit(0);
  } catch (error) {
    logger.error(`${name} migration ${version} error`, { error });
    process.exit(1);
  }
})();
