import { SubscriptionError } from '@blocklet/ai-kit/api';

import { Role } from '../assistant';

export enum ExecutionPhase {
  EXECUTE_BLOCK_START = 'EXECUTE_BLOCK_START',
  EXECUTE_ASSISTANT_START = 'EXECUTE_ASSISTANT_START',
  EXECUTE_ASSISTANT_RUNNING = 'EXECUTE_BLOCK_RUNNING',
  EXECUTE_ASSISTANT_END = 'EXECUTE_ASSISTANT_END',
}
export enum AssistantResponseType {
  ERROR = 'ERROR',
  LOG = 'LOG',
  INPUT = 'INPUT',
  CHUNK = 'CHUNK',
  EXECUTE = 'EXECUTE',
}

export type PromptMessages = Array<{
  role: Role;
  content: string;
}>;

export type RunAssistantResponse =
  | RunAssistantChunk
  | RunAssistantError
  | RunAssistantInput
  | RunAssistantLog
  | RunAssistantExecute;

export type RunAssistantInput = {
  type: AssistantResponseType.INPUT;
  taskId: string;
  parentTaskId?: string;
  assistantId: string;
  assistantName?: string;
  inputParameters?: { [key: string]: string };
  apiArgs?: any;
  fnArgs?: any;
  promptMessages?: PromptMessages;
  stop?: boolean;
  modelParameters?: {
    temperature?: number;
    topP?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    model?: string;
    n?: number;
    quality?: string;
    style?: string;
    size?: string;
  };
};

export type RunAssistantExecute = {
  type: AssistantResponseType.EXECUTE;
  taskId: string;
  parentTaskId?: string;
  assistantId: string;
  assistantName?: string;
  execution:
    | {
        currentPhase: ExecutionPhase.EXECUTE_BLOCK_START;
        blockId: string;
        blockName?: string;
      }
    | {
        currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_START;
      }
    | {
        currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_END;
      }
    | {
        currentPhase: ExecutionPhase.EXECUTE_ASSISTANT_RUNNING;
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
