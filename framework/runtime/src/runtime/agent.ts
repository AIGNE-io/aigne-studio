import { IAgent, RunOptions, RunnableResponse, RunnableResponseStream } from '@aigne/core';

import { CallAI, CallAIImage, GetAgentResult, RunAssistantCallback } from '../assistant/type';
import { defaultImageModel, defaultTextModel, getSupportedImagesModels } from '../common';
import { parseIdentity, stringifyIdentity } from '../common/aid';
import { RuntimeExecutor } from '../executor';
import logger from '../logger';
import { AssistantResponseType } from '../types';
import { nextId } from '../utils/task-id';
import { resourceManager } from './resource-blocklet';
import { AIGNERuntime } from './runtime';

export class Agent<I extends object = object, O = object> implements IAgent<I, O> {
  constructor(
    private project: Promise<AIGNERuntime['project']> | AIGNERuntime['project'],
    private agentId: string
  ) {}

  async run(inputs: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(inputs: I, options?: RunOptions & { stream?: boolean }): Promise<O>;
  async run(inputs: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const { chatCompletions, imageGenerations } = await import('@blocklet/ai-kit/api/call');

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

    const project = await this.project;

    const internal = project.agents?.find((i) => i.id === this.agentId);
    if (!internal) throw new Error('No such agent');

    const execute = (callback: RunAssistantCallback) => {
      const executor = new RuntimeExecutor(
        {
          entry: { project },
          callback,
          callAI,
          callAIImage,
          getMemoryVariables: async (options) => {
            if (options.projectId === project.id) return project.memories ?? [];
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
            } else if (identity.projectId === project.id) {
              const a = project.agents?.find((a) => a.id === identity.agentId);
              if (a) {
                agent = {
                  ...a,
                  project,
                  identity: {
                    projectId: project.id,
                    agentId: a.id,
                    aid: stringifyIdentity({ projectId: project.id, agentId: a.id }),
                  },
                };
              }
            }

            if (options.rejectOnEmpty && !agent) throw new Error('No such agent');

            return agent!;
          },
          entryProjectId: project.id,
          sessionId: project.id,
          messageId,
          clientTime: new Date().toISOString(),
          queryCache: async () => {
            // TODO: implement cache
            return null;
          },
          setCache: async () => {
            // TODO: implement cache
          },
        },
        {
          ...internal,
          identity: {
            projectId: project.id,
            agentId: internal.id,
            aid: stringifyIdentity({ projectId: project.id, agentId: internal.id }),
          },
          project,
        },
        {
          inputs,
          taskId,
        }
      );

      return executor.execute();
    };

    if (options?.stream) {
      return new ReadableStream({
        async start(controller) {
          try {
            const result = await execute((e) => {
              if (e.type === AssistantResponseType.CHUNK) {
                const { content, object } = e.delta;

                controller.enqueue({ $text: content || undefined, delta: object as any });
              }
            });

            controller.enqueue({ delta: result });
          } catch (error) {
            controller.error(error);
          }

          controller.close();
        },
      });
    }

    return execute(() => {});
  }
}
