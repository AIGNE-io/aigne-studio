import { SubscriptionError } from '@blocklet/ai-kit/api';

import { Role } from '../assistant';

export enum ExecutionPhase {
  START_EXECUTION_BLOCK = 'START_EXECUTION_BLOCK',
  START_EXECUTE_TOOL = 'START_EXECUTE_TOOL',
}

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
  type: AssistantResponseType.INPUT;
  taskId: string;
  assistantId: string;
  input: InputMessages;
};

export type RunAssistantExecute = {
  type: AssistantResponseType.EXECUTE;
  taskId: string;
  assistantName: string;
  assistantId: string;
  execution:
    | {
        currentPhase: ExecutionPhase.START_EXECUTION_BLOCK;
        toolName: string;
        id: string;
      }
    | {
        currentPhase: ExecutionPhase.START_EXECUTE_TOOL;
        toolName: string;
        id: string;
      };
};

export type RunAssistantLog = {
  type: AssistantResponseType.LOG;
  taskId: string;
  assistantId: string;
  log: string;
  timestamp: number;
};

export type RunAssistantChunk = {
  type: AssistantResponseType.CHUNK;
  taskId: string;
  assistantId: string;
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
