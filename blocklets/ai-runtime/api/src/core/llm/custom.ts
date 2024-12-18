import { chatCompletions } from '@blocklet/ai-kit/api/call';
import { isChatCompletionChunk } from '@blocklet/ai-kit/api/types/index';
import { BaseLLMParams, LLM } from '@langchain/core/language_models/llms';

export interface CustomLLMInput extends BaseLLMParams {
  model?: string;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  maxTokens?: number;
}

// https://github.com/yanfangli85/langchainjs/blob/d37ab9d91755deb59f0928ea65d28ec584b5db6a/langchain/src/llms/hf.ts 参考实现
export class CustomLLM extends LLM implements CustomLLMInput {
  temperature = 0;

  model = 'gpt-4o';

  constructor(fields: CustomLLMInput) {
    super({ ...fields, concurrency: 1 });

    this.temperature = fields.temperature || 0;
    this.model = fields.model || 'gpt-4o';
  }

  _llmType() {
    return 'custom';
  }

  async _call(prompt: string): Promise<string> {
    const stream = await chatCompletions({
      temperature: this.temperature,
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
    });

    const chunks = [];

    for await (const chunk of stream) {
      if (isChatCompletionChunk(chunk)) {
        chunks.push(chunk.delta.content || '');
      }
    }

    return chunks.join('');
  }
}
