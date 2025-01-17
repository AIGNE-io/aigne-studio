import { agentV1ToRunnableDefinition, getAdapter } from '@aigne/agent-v1';
import type { Context, LLMModelConfiguration, Runnable } from '@aigne/core';
import { LLMModel, LLMModelInputs, TYPES } from '@aigne/core';
import {
  ChatCompletionChunk,
  ChatCompletionInput,
  ChatCompletionResponse,
  isChatCompletionChunk,
  isChatCompletionError,
} from '@blocklet/ai-kit/api/types/chat';
import { inject, injectable } from 'tsyringe';

import logger from '../logger';
import { getDefaultValue } from '../utils/default-value';

const defaultLLMModel = 'gpt-4o-mini';

@injectable()
export class BlockletLLMModel extends LLMModel {
  constructor(
    @inject(TYPES.context) context?: Context,
    @inject(TYPES.llmModelConfiguration) public config?: LLMModelConfiguration
  ) {
    super(context);
  }

  async *process(input: LLMModelInputs) {
    const { chatCompletions } = await import('@blocklet/ai-kit/api/call');

    const model =
      getDefaultValue('model', this.config?.override, input.modelOptions, this.config?.default) || defaultLLMModel;

    const chatInput: ChatCompletionInput = {
      ...input.modelOptions,
      model,
      ...getDefaultValue(
        ['temperature', 'topP', 'presencePenalty', 'frequencyPenalty'],
        this.config?.override,
        input.modelOptions,
        this.config?.default
      ),
      messages: input.messages as ChatCompletionInput['messages'],
      responseFormat: input.responseFormat,
      tools: input.tools,
      toolChoice: input.toolChoice,
    };

    logger.debug('BlockletLLMModel.run inputs', chatInput);

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

    const toolCalls: ChatCompletionChunk['delta']['toolCalls'] = [];

    for await (const chunk of stream!) {
      if (isChatCompletionChunk(chunk)) {
        const { content, toolCalls: calls } = chunk.delta;

        if (calls?.length) {
          toolCalls.push(...calls);
        }

        yield {
          $text: content || undefined,
          delta: toolCalls ? { toolCalls } : undefined,
        };
      } else if (isChatCompletionError(chunk)) {
        throw new Error(chunk.error.message);
      }
    }
  }
}
