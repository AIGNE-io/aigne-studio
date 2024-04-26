import type {
  Agent,
  ApiAssistant,
  AssistantBase,
  ExecuteBlock,
  ExecuteBlockSelectAll,
  ExecuteBlockSelectByPrompt,
  FunctionAssistant,
  ImageAssistant,
  Parameter,
  PromptAssistant,
  PromptMessage,
  SelectParameter,
  Variable,
  VariableTypeBase,
} from '.';

export type ArrayToYjs<T extends Array<{ id: string }>> = { [key: string]: { index: number; data: T[number] } };

export type VariableYjs = Omit<Variable, 'type'> & { type?: VariableTypeYjs };

export type VariablesYjs = {
  type: 'variables';
  variables?: VariableYjs[];
};

export type FileTypeYjs = AssistantYjs | { $base64: string } | VariablesYjs;

export type AssistantYjs = AgentYjs | PromptAssistantYjs | ApiAssistantYjs | FunctionAssistantYjs | ImageAssistantYjs;

export type ExecuteBlockSelectAllYjs = Omit<ExecuteBlockSelectAll, 'tools'> & {
  tools?: { [key: string]: { index: number; data: NonNullable<ExecuteBlock['tools']>[number] } };
};

export type ExecuteBlockSelectByPromptYjs = Omit<ExecuteBlockSelectByPrompt, 'tools'> & {
  tools?: { [key: string]: { index: number; data: NonNullable<ExecuteBlock['tools']>[number] } };
};

export type ExecuteBlockYjs = ExecuteBlockSelectAllYjs | ExecuteBlockSelectByPromptYjs;

export type VariableTypeYjs = VariableTypeBase &
  (
    | { type?: undefined }
    | {
        type: 'textStream';
        defaultValue?: string;
      }
    | {
        type: 'string';
        defaultValue?: string;
      }
    | {
        type: 'number';
        defaultValue?: number;
      }
    | {
        type: 'object';
        properties?: ArrayToYjs<VariableTypeYjs[]>;
      }
    | {
        type: 'array';
        element?: VariableTypeYjs;
      }
  );

export type OutputVariableYjs = VariableTypeYjs & { variable?: { key: string; scope: string } };

export type PromptYjs =
  | {
      type: 'message';
      data: PromptMessage;
      visibility?: 'hidden';
    }
  | {
      type: 'executeBlock';
      data: ExecuteBlockYjs;
      visibility?: 'hidden';
    };

export type AssistantBaseYjs<T extends AssistantBase> = Omit<
  T,
  'parameters' | 'tests' | 'entries' | 'outputVariables'
> & {
  parameters?: { [key: string]: { index: number; data: ParameterYjs } };
  tests?: ArrayToYjs<NonNullable<PromptAssistant['tests']>>;
  entries?: ArrayToYjs<NonNullable<AssistantBase['entries']>>;
  outputVariables?: ArrayToYjs<OutputVariableYjs[]>;
};

export interface AgentYjs extends AssistantBaseYjs<Agent> {}

export interface PromptAssistantYjs extends Omit<AssistantBaseYjs<PromptAssistant>, 'prompts'> {
  prompts?: { [key: string]: { index: number; data: PromptYjs } };
}

export interface ImageAssistantYjs extends Omit<AssistantBaseYjs<ImageAssistant>, 'prepareExecutes'> {
  prepareExecutes?: { [key: string]: { index: number; data: ExecuteBlockYjs } };
}

export interface ApiAssistantYjs extends Omit<AssistantBaseYjs<ApiAssistant>, 'prepareExecutes' | 'requestParameters'> {
  prepareExecutes?: { [key: string]: { index: number; data: ExecuteBlockYjs } };
  requestParameters?: ArrayToYjs<NonNullable<ApiAssistant['requestParameters']>>;
}

export interface FunctionAssistantYjs extends Omit<AssistantBaseYjs<FunctionAssistant>, 'prepareExecutes'> {
  prepareExecutes?: { [key: string]: { index: number; data: ExecuteBlockYjs } };
}

export type ParameterYjs =
  | Exclude<Parameter, { type: 'select' }>
  | (Omit<SelectParameter, 'options'> & { options?: ArrayToYjs<NonNullable<SelectParameter['options']>> });
