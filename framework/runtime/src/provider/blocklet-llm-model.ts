import type { Context, Runnable } from '@aigne/core';
import {
  LLMModel,
  LLMModelInputs,
  LLMModelOutputs,
  RunOptions,
  RunnableResponse,
  RunnableResponseStream,
  TYPES,
} from '@aigne/core';
import {
  ChatCompletionInput,
  ChatCompletionResponse,
  isChatCompletionChunk,
  isChatCompletionError,
} from '@blocklet/ai-kit/api/types/chat';
import { inject, injectable } from 'tsyringe';

import logger from '../logger';
import { getAdapter } from '../v1/resource-blocklet';
import { agentV1ToRunnableDefinition } from '../v1/type';

const defaultLLMModel = 'gpt-4o-mini';

@injectable()
export class BlockletLLMModel extends LLMModel {
  constructor(
    @inject(TYPES.context) public context?: Context,
    public options?: { defaultModel?: string }
  ) {
    super();
  }

  async run(
    input: LLMModelInputs,
    options: RunOptions & { stream: true }
  ): Promise<RunnableResponseStream<LLMModelOutputs>>;
  async run(input: LLMModelInputs, options?: RunOptions & { stream?: false }): Promise<LLMModelOutputs>;
  async run(input: LLMModelInputs, options?: RunOptions): Promise<RunnableResponse<LLMModelOutputs>> {
    const { chatCompletions } = await import('@blocklet/ai-kit/api/call');

    const model = input.modelSettings?.model || this.options?.defaultModel || defaultLLMModel;

    const chatInput: ChatCompletionInput = {
      ...input.modelSettings,
      model,
      messages: input.messages as ChatCompletionInput['messages'],
      responseFormat: input.responseFormat,
      tools: input.tools,
      toolChoice: input.toolChoice,
    };

    logger.debug('BlockletLLMModel.run inputs', JSON.stringify(chatInput));

    let stream: ReadableStream<ChatCompletionResponse> | undefined;

    if (this.context) {
      const adapter = await getAdapter('llm', model);
      if (adapter) {
        const runnable = await this.context.resolve<
          Runnable<ChatCompletionInput, { $llmResponseStream: ReadableStream<ChatCompletionResponse> }>
        >(agentV1ToRunnableDefinition(adapter.agent));
        stream = (await runnable.run(chatInput, { stream: false })).$llmResponseStream;
      }
    }

    if (!stream) {
      stream = (await chatCompletions({
        ...chatInput,
        stream: true,
      })) as any as ReadableStream<ChatCompletionResponse>; // TODO: fix chatCompletions response type in @blocklet/ai-kit;
    }

    if (options?.stream) {
      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream!) {
              if (isChatCompletionChunk(chunk)) {
                const { content, toolCalls } = chunk.delta;

                controller.enqueue({
                  $text: content || undefined,
                  delta: toolCalls ? { toolCalls } : undefined,
                });
              } else if (isChatCompletionError(chunk)) {
                throw new Error(chunk.error.message);
              }
            }
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });
    }

    const result: LLMModelOutputs = {};

    for await (const chunk of stream) {
      if (isChatCompletionChunk(chunk)) {
        if (chunk.delta.content) {
          result.$text ||= '';
          result.$text += chunk.delta.content;
        }
        if (chunk.delta.toolCalls?.length) {
          result.toolCalls ||= [];
          result.toolCalls.push(...chunk.delta.toolCalls);
        }
      } else if (isChatCompletionError(chunk)) {
        throw new Error(chunk.error.message);
      }
    }

    return result;
  }
}
