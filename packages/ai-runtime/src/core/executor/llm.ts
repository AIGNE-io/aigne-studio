import { ReadableStream, TransformStream } from 'stream/web';

import { ChatCompletionResponse, isChatCompletionUsage } from '@blocklet/ai-kit/api/types/index';
import { logger } from '@blocklet/sdk/lib/config';

import {
  AssistantResponseType,
  PromptAssistant,
  RuntimeOutputVariable,
  outputVariablesToJsonSchema,
} from '../../types';
import {
  extractMetadataFromStream,
  metadataOutputFormatPrompt,
  metadataStreamOutputFormatPrompt,
} from '../assistant/generate-output';
import { GetAgentResult } from '../assistant/type';
import { renderMessage } from '../utils/render-message';
import retry from '../utils/retry';
import { nextTaskId } from '../utils/task-id';
import { AgentExecutorBase, AgentExecutorOptions } from './base';

export class LLMAgentExecutor extends AgentExecutorBase {
  private retryTimes = 0;

  override async process(
    agent: PromptAssistant & GetAgentResult,
    { inputs, taskId, parentTaskId }: AgentExecutorOptions
  ) {
    const messages = (
      await Promise.all(
        (agent.prompts ?? [])
          .filter((i) => i.visibility !== 'hidden')
          .map(async (prompt) => {
            if (prompt.type === 'message') {
              return {
                role: prompt.data.role,
                content: await renderMessage(
                  // 过滤注释节点
                  prompt.data.content
                    ?.split('\n')
                    .filter((i) => !i.startsWith('//'))
                    .join('\n') || '',
                  inputs
                ),
              };
            }

            console.warn('Unsupported prompt type', prompt);
            return undefined;
          })
      )
    )
      .flat()
      .filter((i): i is Required<NonNullable<typeof i>> => !!i?.content);

    const filterOutputVariables = (agent.outputVariables ?? []).filter((i) => !i.hidden);
    const outputVariables =
      filterOutputVariables.filter((i): i is typeof i & Required<Pick<typeof i, 'name'>> => !!i.name) ?? [];

    const schema = outputVariablesToJsonSchema(agent, {
      variables: await this.context.getMemoryVariables(agent.identity),
    });

    const hasTextStream = outputVariables.some((i) => i.name === RuntimeOutputVariable.text);
    const hasJson = !!schema && Object.values(schema.properties).length > 0;

    const outputSchema = JSON.stringify(schema);

    const messagesWithSystemPrompt = [...messages];
    const lastSystemIndex = messagesWithSystemPrompt.findLastIndex((i) => i.role === 'system');

    if (hasJson) {
      if (hasTextStream) {
        messagesWithSystemPrompt.splice(lastSystemIndex + 1, 0, {
          role: 'system',
          content: metadataStreamOutputFormatPrompt(outputSchema),
        });
      } else {
        messagesWithSystemPrompt.splice(lastSystemIndex + 1, 0, {
          role: 'system',
          content: metadataOutputFormatPrompt(outputSchema),
        });
      }
    }

    if (!messagesWithSystemPrompt.length) return undefined;

    this.context.callback?.({
      type: AssistantResponseType.INPUT,
      assistantId: agent.id,
      parentTaskId,
      taskId,
      assistantName: agent.name,
      inputParameters: inputs,
      promptMessages: messagesWithSystemPrompt,
    });

    const run = async () => {
      this.retryTimes += 1;

      let result = '';
      const metadataStrings: string[] = [];

      const executor = agent.executor?.agent?.id
        ? await this.context.getAgent({
            blockletDid: agent.executor.agent.blockletDid || agent.identity.blockletDid,
            projectId: agent.executor.agent.projectId || agent.identity.projectId,
            projectRef: agent.identity.projectRef,
            working: agent.identity.working,
            agentId: agent.executor.agent.id,
            rejectOnEmpty: true,
          })
        : undefined;

      const modelInfo = {
        model: agent.model,
        temperature: agent.temperature,
        topP: agent.topP,
        presencePenalty: agent.presencePenalty,
        frequencyPenalty: agent.frequencyPenalty,
      };

      const chatCompletionChunk = executor
        ? ((
            await this.context.executor(this.context).execute(executor, {
              inputs: {
                ...inputs,
                ...agent.executor?.inputValues,
                [executor.parameters?.find((i) => i.type === 'llmInputMessages' && !i.hidden)?.key!]:
                  messagesWithSystemPrompt,
              },
              taskId: nextTaskId(),
              parentTaskId: taskId,
            })
          )[RuntimeOutputVariable.llmResponseStream] as ReadableStream<ChatCompletionResponse>)
        : await this.context.callAI({
            assistant: agent,
            input: {
              stream: true,
              messages: messagesWithSystemPrompt,
              ...modelInfo,
            },
          });

      const stream = extractMetadataFromStream(
        chatCompletionChunk.pipeThrough(
          new TransformStream({
            transform: (chunk, controller) => {
              if (isChatCompletionUsage(chunk)) {
                this.context.callback?.({
                  type: AssistantResponseType.USAGE,
                  taskId,
                  assistantId: agent.id,
                  usage: chunk.usage,
                });
              }

              controller.enqueue(chunk);
            },
          })
        ),
        hasJson
      );

      for await (const chunk of stream) {
        if (chunk.type === 'text') {
          const { text } = chunk;

          result += text;

          if (hasTextStream && this.retryTimes === 1) {
            this.context.callback?.({
              type: AssistantResponseType.CHUNK,
              taskId,
              assistantId: agent.id,
              delta: { content: text },
            });
          }
        } else if (chunk.type === 'match') {
          metadataStrings.push(chunk.text);
        }
      }

      const json = {};
      for (const i of metadataStrings) {
        try {
          const obj = JSON.parse(i);
          Object.assign(json, obj);
        } catch {
          // ignore
        }
      }

      // try to parse all text content as a json
      try {
        Object.assign(json, JSON.parse(result));
      } catch {
        // ignore
      }

      try {
        return await super.validateOutputs(agent, {
          inputs,
          outputs: { ...json, $text: result },
        });
      } catch (error) {
        logger.error('validate LLM outputs error', error);
        throw new Error('Unexpected response format from AI');
      }
    };

    return await retry(run, this.context.maxRetries);
  }
}
