import { SubscriptionError } from '@blocklet/ai-kit/api';

import { Role } from '../assistant';

export enum AssistantResponseType {
  ERROR = 'ERROR',
  LOG = 'LOG',
  INPUT = 'INPUT',
  CHUNK = 'CHUNK',
  EXECUTE = 'EXECUTE',
}

export type InputMessages = {
  messages: Array<{
    role: Role;
    content: string;
  }>;
};

export type RunAssistantResponse =
  | RunAssistantChunk
  | RunAssistantError
  | RunAssistantInput
  | RunAssistantLog
  | RunAssistantExecute;

export type RunAssistantInput = {
  taskId: string;
  assistantId: string;
  type: AssistantResponseType.INPUT;
  input: InputMessages;
};

export type RunAssistantExecute = {
  taskId: string;
  toolId: string;
  assistantName: string;
  assistantId?: string;
  id: string;
  type: AssistantResponseType.EXECUTE;
  content?: string;
};

export type RunAssistantLog = {
  taskId: string;
  type: AssistantResponseType.LOG;
  assistantId: string;
  log: string;
  timestamp: number;
};

export type RunAssistantChunk = {
  taskId: string;
  assistantId: string;
  type: AssistantResponseType.CHUNK;
  delta: {
    content?: string | null;
    images?: {
      b64_string?: string;
      url?: string;
    }[];
  };
};

export type RunAssistantError = {
  type: AssistantResponseType.ERROR;
  error: { message: string } | SubscriptionError;
};
