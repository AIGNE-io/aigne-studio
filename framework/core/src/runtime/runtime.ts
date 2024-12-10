import { join } from 'path';

import { chatCompletions, imageGenerations } from '@blocklet/ai-kit/api/call';
import { readFile } from 'fs-extra';
import { glob } from 'glob';
import { parse } from 'yaml';

import { CallAI, CallAIImage, GetAgentResult } from '../assistant/type';
import { defaultImageModel, defaultTextModel, getSupportedImagesModels } from '../common';
import { parseIdentity, stringifyIdentity } from '../common/aid';
import { RuntimeExecutor } from '../executor';
import logger from '../logger';
import { Agent, Variable } from '../types';
import { nextId } from '../utils/task-id';
import { resourceManager } from './resource-blocklet';

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

  async runAgent(agentId: string, inputs: object) {
    const agent = this.project.agents?.find((a) => a.id === agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const taskId = nextId();

    const messageId = nextId();

    const callAI: CallAI = async ({ input }) => {
      return await chatCompletions({ ...input, model: input.model || defaultTextModel });
    };

    const callAIImage: CallAIImage = async ({ assistant, input }) => {
      const imageAssistant = assistant.type === 'image' ? assistant : undefined;
      const supportImages = await getSupportedImagesModels();
      const imageModel = supportImages.find((i) => i.model === (imageAssistant?.model || defaultImageModel));

      const model = {
        model: input.model || imageModel?.model,
        n: input.n || imageModel?.nDefault,
        quality: input.quality || imageModel?.qualityDefault,
        style: input.style || imageModel?.styleDefault,
        size: input.size || imageModel?.sizeDefault,
      };
      return imageGenerations({
        ...input,
        ...model,
        responseFormat: 'url',
      }) as any;
    };

    const executor = new RuntimeExecutor(
      {
        entry: { project: this.project },
        callback: () => {},
        callAI,
        callAIImage,
        getMemoryVariables: async (options) => {
          if (options.projectId === this.project.id) return this.project.memories ?? [];
          logger.warn('Unsupported to get memory variables from other projects');
          return [];
        },
        getAgent: async (options) => {
          const identity = parseIdentity(options.aid, { rejectWhenError: true });

          let agent: GetAgentResult | undefined;

          if (identity.blockletDid) {
            const { blockletDid, projectId, agentId } = identity;

            const res = await resourceManager.getAgent({ blockletDid, projectId, agentId });

            if (res) {
              agent = {
                ...res.agent,
                project: res.project,
                identity: {
                  blockletDid,
                  projectId,
                  agentId,
                  aid: stringifyIdentity({ blockletDid, projectId, agentId }),
                },
              };
            }
          } else if (identity.projectId === this.project.id) {
            const a = this.project.agents?.find((a) => a.id === identity.agentId);
            if (a) {
              agent = {
                ...a,
                project: this.project,
                identity: {
                  projectId: this.project.id,
                  agentId: a.id,
                  aid: stringifyIdentity({ projectId: this.project.id, agentId: a.id }),
                },
              };
            }
          }

          if (options.rejectOnEmpty && !agent) throw new Error('No such agent');

          return agent!;
        },
        entryProjectId: this.project.id,
        sessionId: this.project.id,
        messageId,
        clientTime: new Date().toISOString(),
        queryCache: async ({ aid, cacheKey }) => {
          // TODO: implement cache
          return null;
        },
        setCache: async ({ aid, cacheKey, inputs, outputs }) => {
          // TODO: implement cache
        },
      },
      {
        ...agent,
        identity: {
          projectId: this.project.id,
          agentId: agent.id,
          aid: stringifyIdentity({ projectId: this.project.id, agentId: agent.id }),
        },
        project: this.project,
      },
      {
        inputs,
        taskId,
      }
    );

    return executor.execute();
  }
}
