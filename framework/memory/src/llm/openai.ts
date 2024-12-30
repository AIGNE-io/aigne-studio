import { chatCompletions } from '@blocklet/ai-kit/api/call';
import { ChatCompletionInput, isChatCompletionChunk } from '@blocklet/ai-kit/api/types/chat';
import OpenAI from 'openai';

import logger from '../logger';

export default class OpenAIManager extends OpenAI {
  async create<T extends object>(input: ChatCompletionInput): Promise<T> {
    const stream = await chatCompletions({ model: 'gpt-4o-mini', temperature: 0, ...input });

    const chunks = [];

    for await (const chunk of stream) {
      if (isChatCompletionChunk(chunk)) {
        chunks.push(chunk.delta.content || '');
      }
    }

    const result = chunks.join('');

    try {
      return JSON.parse(result);
    } catch (error) {
      logger.error(`Failed to parse JSON: ${result}`);
      return {} as T;
    }
  }
}
