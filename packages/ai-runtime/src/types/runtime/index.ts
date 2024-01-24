import { SubscriptionError } from '@blocklet/ai-kit/api';

import { Role } from '../assistant';

export enum ExecutionPhase {
  StartExecution = 'StartExecution',
  ExecuteTool = 'ExecuteTool',
  EndExecution = 'EndExecution',
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
        currentPhase: ExecutionPhase.StartExecution;
        toolName: string;
        id: string;
      }
    | {
        currentPhase: ExecutionPhase.ExecuteTool;
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
