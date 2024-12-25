import { omitBy } from 'lodash';
import OpenAI from 'openai';

import { FACT_RETRIEVAL_PROMPT } from './prompts';

interface Message {
  role: string; //'system' | 'user' | 'assistant'
  content: string;
}

export function parseMessages(messages: Message[]): string {
  return messages.reduce((response, msg) => {
    return response + `${msg.role}: ${msg.content}\n`;
  }, '');
}

export function getFactRetrievalMessages(messages: string): [string, string] {
  return [FACT_RETRIEVAL_PROMPT, `Input: ${messages}`];
}

export async function generateStructuredResponse(
  llm: OpenAI,
  messages: Message[],
  responseFormat: { [key: string]: any }
): Promise<any> {
  const response = await llm.chat.completions.create({
    model: 'gpt-4o',
    messages: messages as any[],
    temperature: 0,
    ...omitBy({ response_format: responseFormat }, (value) => !value),
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}
