import { SubscriptionError } from '@blocklet/ai-kit/api';

import { ExecuteBlock, Role } from '../assistant';

export enum ExecutionPhase {
  EXECUTE_BLOCK_START = 'EXECUTE_BLOCK_START',
  EXECUTE_SELECT_STOP = 'EXECUTE_SELECT_STOP',
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
        currentPhase: ExecutionPhase.EXECUTE_SELECT_STOP;
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
  respondAs?: ExecuteBlock['respondAs'];
  delta: {
    content?: string | null;
    images?: { url: string }[];
    object?: any;
  };
};

export type RunAssistantError = {
  type: AssistantResponseType.ERROR;
  error: { message: string } | SubscriptionError;
};

export type RuntimeOutputVariable =
  | '$textStream'
  | '$images'
  | '$suggested.questions'
  | '$page.background.image'
  | '$page.background.color'
  | '$input';

export const RuntimeOutputVariableNames: RuntimeOutputVariable[] = [
  '$suggested.questions',
  '$input',
  '$page.background.color',
  '$page.background.image',
];

export interface RuntimeOutputVariables {
  '$suggested.questions'?: { question: string }[];
  '$page.background.image'?: string;
  '$page.background.color'?: string;
  $input?: Input;
}

export type Action =
  | {
      type: 'navigateTo';
      to: {
        type: 'assistant';
        assistantId: string;
      };
    }
  | {
      type: 'navigateBack';
    };

export type Input = {
  type: 'select';
  options: {
    title: string;
    action: Action;
  }[];
};
