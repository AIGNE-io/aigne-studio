import { ReadableStream } from 'stream/web';

import { ChatCompletionResponse, isChatCompletionChunk } from '@blocklet/ai-kit/api/types/index';
import { logger } from '@blocklet/sdk/lib/config';

import { defaultTextModel } from '../../common';
import { parseIdentity, stringifyIdentity } from '../../common/aid';
import {
  AssistantResponseType,
  Prompt,
  PromptAssistant,
  Role,
  RuntimeOutputVariable,
  jsonSchemaToOpenAIJsonSchema,
} from '../../types';
import { parseDirectives } from '../../types/assistant/mustache/directive';
import { GetAgentResult } from '../assistant/type';
import { nextTaskId } from '../utils/task-id';
import { AgentExecutorBase } from './base';

export class LLMAgentExecutor extends AgentExecutorBase<PromptAssistant> {
  get modelInfo() {
    const { agent } = this;

    const model = agent.model || agent.project.model || defaultTextModel;
    const defaultModelInfo = model === agent.project.model ? agent.project : undefined;
    return {
      model,
      temperature: agent.temperature ?? defaultModelInfo?.temperature,
      topP: agent.topP ?? defaultModelInfo?.topP,
      presencePenalty: agent.presencePenalty ?? defaultModelInfo?.presencePenalty,
      frequencyPenalty: agent.frequencyPenalty ?? defaultModelInfo?.frequencyPenalty,
    };
  }

  private _executor:
    | Promise<{ executor: GetAgentResult; inputValues?: { [key: string]: any } } | undefined>
    | undefined;

  get executor() {
    this._executor ??= (async () => {
      const { agent } = this;

      const identity = parseIdentity(agent.identity.aid, { rejectWhenError: true });

      return agent.executor?.agent?.id
        ? {
            executor: await this.context.getAgent({
              aid: stringifyIdentity({
                blockletDid: agent.executor.agent.blockletDid || identity.blockletDid,
                projectId: agent.executor.agent.projectId || identity.projectId,
                projectRef: identity.projectRef,
                agentId: agent.executor.agent.id,
              }),
              working: agent.identity.working,
              rejectOnEmpty: true,
            }),
            inputValues: agent.executor.inputValues,
          }
        : agent.project.executor?.agent?.id
          ? {
              executor: await this.context.getAgent({
                aid: stringifyIdentity({
                  blockletDid: agent.project.executor.agent.blockletDid || identity.blockletDid,
                  projectId: agent.project.executor.agent.projectId || identity.projectId,
                  projectRef: identity.projectRef,
                  agentId: agent.project.executor.agent.id,
                }),
                working: agent.identity.working,
                rejectOnEmpty: true,
              }),
              inputValues: agent.project.executor.inputValues,
            }
          : undefined;
    })();

    return this._executor;
  }

  private getMessages({ inputs }: { inputs: { [key: string]: any } }) {
    const { agent } = this;

    const createContentStructure = async (
      content: string,
      variables: string[],
      agent: PromptAssistant,
      prompt: Prompt
    ) => {
      const parameters = agent.parameters ?? [];

      // 没有特殊变量
      if (!variables.length) {
        const renderedContent = await this.renderMessage(content, { ...inputs, ...this.globalContext });
        return renderedContent;
      }

      // 没有图片变量
      const haveImageParameter = parameters.filter((i) => i.type === 'image').some((i) => variables.includes(i.key!));
      if (!haveImageParameter) {
        const renderedContent = await this.renderMessage(content, { ...inputs, ...this.globalContext });
        return renderedContent;
      }

      // 创建图片变量标记
      const createImageMarker = (variable: string) => `__IMAGE_${variable}__`;
      const imageVariablesMap: { [key: string]: string } = {};
      const imageVariables: { marker: string; value: string }[] = [];

      // 当前参数有图片变量
      parameters
        .filter((i) => i.type === 'image' && i.key && variables.includes(i.key!))
        .forEach((param) => {
          if (param.type === 'image' && param.key && inputs[param.key]) {
            const marker = createImageMarker(param.key);
            imageVariablesMap[param.key] = marker;
            imageVariables.push({ marker, value: inputs[param.key] });
          }
        });

      const renderedContent = await this.renderMessage(content, {
        ...inputs,
        ...this.globalContext,
        ...imageVariablesMap,
      });

      const contentParts: {
        type: string;
        text?: string;
        imageUrl?: { url: string };
      }[] = [];

      if (imageVariables.length === 0) {
        return renderedContent;
      }

      let remainingContent = renderedContent;
      for (const { marker, value } of imageVariables) {
        const parts = remainingContent.split(marker);

        if (parts[0]) {
          contentParts.push({ type: 'text', text: parts[0] });
        }

        // 只有是 user 时，才处理
        if (prompt.data.role === 'user') {
          const list = Array.isArray(value) ? value : [value];
          list.forEach((item) => contentParts.push({ type: 'image_url', imageUrl: { url: item } }));
        }

        remainingContent = parts[1] || '';
      }

      if (remainingContent) {
        contentParts.push({ type: 'text', text: remainingContent });
      }

      logger.info('have image messages', contentParts);
      return contentParts;
    };

    return (async () =>
      (
        await Promise.all(
          (agent.prompts ?? [])
            .filter((i) => i.visibility !== 'hidden')
            .map(async (prompt) => {
              if (prompt.type === 'message') {
                const content =
                  prompt.data.content
                    ?.split('\n')
                    .filter((i) => !i.startsWith('//'))
                    .join('\n') || '';

                const variables = parseDirectives(content)
                  .filter((i) => i.type === 'variable')
                  .map((i) => i.name);
                const contentStructure = await createContentStructure(content, variables, agent, prompt);

                return {
                  role: prompt.data.role,
                  content: contentStructure,
                };
              }

              console.warn('Unsupported prompt type', prompt);
              return undefined;
            })
        )
      )
        .flat()
        .filter((i): i is Required<NonNullable<typeof i>> => !!i?.content))();
  }

  override async process({ inputs }: { inputs: { [key: string]: any } }) {
    const messages = await this.getMessages({ inputs });

    const {
      agent,
      options: { parentTaskId, taskId },
    } = this;

    this.context.callback?.({
      type: AssistantResponseType.INPUT,
      assistantId: agent.id,
      parentTaskId,
      taskId,
      assistantName: agent.name,
      inputParameters: this.hideSecretInputs(inputs, agent),
      promptMessages: messages,
    });

    const { hasStreamingTextOutput, hasJsonOutputs, schema } = await this.outputsInfo;

    const [json, { text }] = await Promise.all([
      hasJsonOutputs ? this.callAIGetJsonOutput({ messages, schema }) : undefined,
      hasStreamingTextOutput ? this.callAIGetTextStreamOutput({ messages, inputs }) : { text: undefined },
    ]);

    try {
      return await super.validateOutputs({
        inputs,
        outputs: { ...json, $text: text },
      });
    } catch (error) {
      logger.error('validate LLM outputs error', error);
      throw new Error('Unexpected response format from AI');
    }
  }

  private async callAIGetJsonOutput({ messages, schema }: { messages: { role: Role; content: any }[]; schema: any }) {
    const { modelInfo } = this;

    const result = await this.context.callAI({
      assistant: this.agent,
      input: {
        messages,
        ...modelInfo,
        responseFormat: {
          type: 'json_schema',
          jsonSchema: {
            name: 'output',
            schema: jsonSchemaToOpenAIJsonSchema(schema),
            strict: true,
          },
        },
      },
    });

    let json = '';

    for await (const i of result) {
      if (isChatCompletionChunk(i)) {
        json += i.delta.content || '';
      }
    }

    try {
      return JSON.parse(json);
    } catch (error) {
      logger.error(json, error);
      throw new Error('parse ai json schema output error');
    }
  }

  private async callAIGetTextStreamOutput({
    messages,
    inputs,
  }: {
    messages: { role: Role; content: any }[];
    inputs: { [key: string]: any };
  }) {
    const {
      agent,
      options: { taskId },
    } = this;

    const stream = await this.callAIOrExecutor({
      messages,
      inputs,
    });

    let text = '';

    for await (const chunk of stream) {
      if (isChatCompletionChunk(chunk)) {
        text += chunk.delta.content || '';

        this.context.callback?.({
          type: AssistantResponseType.CHUNK,
          taskId,
          assistantId: agent.id,
          delta: { content: chunk.delta.content },
        });
      }
    }

    return { text };
  }

  private async callAIOrExecutor({
    messages,
    inputs,
  }: {
    messages: { role: Role; content: any }[];
    inputs: { [key: string]: any };
  }) {
    const {
      agent,
      modelInfo,
      options: { taskId },
    } = this;
    const e = await this.executor;

    return e
      ? ((
          await this.context
            .executor(e.executor, {
              inputs: {
                ...inputs,
                ...e.inputValues,
                [e.executor.parameters?.find((i) => i.type === 'llmInputMessages' && !i.hidden)?.key!]: messages,
              },
              taskId: nextTaskId(),
              parentTaskId: taskId,
            })
            .execute()
        )[RuntimeOutputVariable.llmResponseStream] as ReadableStream<ChatCompletionResponse>)
      : await this.context.callAI({
          assistant: agent,
          input: {
            stream: true,
            messages,
            ...modelInfo,
          },
        });
  }
}
