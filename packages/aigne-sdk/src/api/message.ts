import { joinURL } from 'ufo';

import { aigneRuntimeApi } from './api';

export interface Message {
  id: string;
  agentId: string;
  blockletDid?: string;
  createdAt: string;
  updatedAt: string;
  projectId: string;
  projectRef?: string;
  sessionId: string;
  userId: string;
  status: 'generating' | 'done';
  steps: Array<{
    id: string;
    agentId: string;
    startTime: string;
    endTime: string;
    objects: any[];
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  inputs?: {
    [key: string]: any;
  };
  outputs: {
    content?: string;
    objects?: {
      [key: string]: any;
    }[];
  };
  error?: {
    type?: string;
    message: string;
  };
}

export async function getMessageById({ messageId }: { messageId: string }): Promise<Message> {
  return aigneRuntimeApi.get(joinURL('/api/messages', messageId)).then((res) => res.data);
}
