import {
  LLMModel,
  LLMModelInputs,
  LLMModelOutputs,
  RunOptions,
  RunnableResponse,
  RunnableResponseStream,
} from '@aigne/core';
import { ChatCompletionInput, isChatCompletionChunk, isChatCompletionError } from '@blocklet/ai-kit/api/types/chat';

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
                controller.enqueue({
                  delta: {
                    $text: chunk.delta.content,
                    toolCalls: chunk.delta.toolCalls,
                  },
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
