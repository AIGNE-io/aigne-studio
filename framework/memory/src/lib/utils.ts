import { FACT_RETRIEVAL_PROMPT } from './prompts';

// import { ReadableStream } from 'stream/web';

interface Message {
  role: string; // 'system' | 'user' | 'assistant'
  content: string;
}

export function parseMessages(messages: Message[]): string {
  return messages.reduce((response, msg) => {
    return `${response}${msg.role}: ${msg.content}\n`;
  }, '');
}

export function getFactRetrievalMessages(messages: string): [string, string] {
  return [FACT_RETRIEVAL_PROMPT, `Input: ${messages}`];
}

export function objectToStream<T>(obj: T): ReadableStream<T> {
  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(obj);
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });
}
