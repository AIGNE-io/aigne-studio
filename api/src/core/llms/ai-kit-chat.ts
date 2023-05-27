import { call } from '@blocklet/sdk/lib/component';
import { CallbackManagerForLLMRun } from 'langchain/callbacks';
import { BaseLLMParams, LLM } from 'langchain/llms/base';
import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  CreateChatCompletionRequest,
} from 'openai';

export class AIKitChat extends LLM {
  override get callKeys() {
    return ['stop', 'signal', 'timeout', 'options'];
  }

  temperature = 1;

  modelName = 'gpt-3.5-turbo';

  constructor(fields?: Partial<Pick<AIKitChat, 'temperature' | 'modelName'>> & BaseLLMParams) {
    super(fields ?? {});

    this.modelName = fields?.modelName ?? this.modelName;
    this.temperature = fields?.temperature ?? this.temperature;
  }

  /**
   * Get the parameters used to invoke the model
   */
  override invocationParams(): Omit<CreateChatCompletionRequest, 'messages'> {
    return {
      model: this.modelName,
      temperature: this.temperature,
    };
  }

  override _identifyingParams() {
    return {
      model_name: this.modelName,
      ...this.invocationParams(),
    };
  }

  private formatMessages(prompt: string): ChatCompletionRequestMessage[] {
    try {
      const arr = JSON.parse(prompt);
      if (Array.isArray(arr)) {
        const messages: ChatCompletionRequestMessage[] = [];
        const roleMap: { [key: string]: ChatCompletionRequestMessageRoleEnum } = {
          system: 'system',
          human: 'user',
          ai: 'assistant',
        };
        for (const i of arr) {
          if (!i) {
            break;
          }
          const role = roleMap[i.type];
          const content = typeof i.data?.content === 'string' ? i.data.content : undefined;
          if (!role || !content) {
            break;
          }
          messages.push({ role, content });
        }
        if (arr.length === messages.length) {
          return messages;
        }
      }
    } catch {
      /* empty */
    }

    const message: ChatCompletionRequestMessage = {
      role: 'user',
      content: prompt,
    };
    return [message];
  }

  override async _call(
    prompt: string,
    _: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    const params = this.invocationParams();
    const messages = this.formatMessages(prompt);

    const { data } = await call({
      name: 'ai-kit',
      path: '/api/v1/sdk/completions',
      method: 'POST',
      data: {
        ...params,
        stream: true,
        messages,
      },
      responseType: 'stream',
    });

    let response = '';
    const decoder = new TextDecoder();

    for await (const chunk of data) {
      const token = decoder.decode(chunk);
      runManager?.handleLLMNewToken(token);
      response += token;
    }

    return response;
  }

  override _llmType() {
    return 'ai-kit';
  }
}
