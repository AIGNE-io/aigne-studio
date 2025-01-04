import {
  LLMModel,
  LLMModelInputs,
  LLMModelOutputs,
  RunOptions,
  RunnableResponse,
  RunnableResponseStream,
} from '@aigne/core';
import { ChatCompletionInput, isChatCompletionChunk, isChatCompletionError } from '@blocklet/ai-kit/api/types/chat';

import logger from '../logger';

export class BlockletLLMModel extends LLMModel {
  async run(
    input: LLMModelInputs,
    options: RunOptions & { stream: true }
  ): Promise<RunnableResponseStream<LLMModelOutputs>>;
  async run(input: LLMModelInputs, options?: RunOptions & { stream?: false }): Promise<LLMModelOutputs>;
  async run(input: LLMModelInputs, options?: RunOptions): Promise<RunnableResponse<LLMModelOutputs>> {
    const { chatCompletions } = await import('@blocklet/ai-kit/api/call');

    const chatInput: ChatCompletionInput = {
      ...input.modelSettings,
      messages: input.messages as ChatCompletionInput['messages'],
      responseFormat: input.responseFormat,
      tools: input.tools,
      toolChoice: input.toolChoice,
    };

    logger.debug('BlockletLLMModel.run inputs', chatInput);

    // TODO: support LLM Adapter
    const stream = await chatCompletions({
      ...chatInput,
      stream: true,
    });

    if (options?.stream) {
      return new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
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
