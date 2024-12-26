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
