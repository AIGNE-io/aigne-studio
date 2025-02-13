import { ProjectSettings } from '../resource';
import {
  RuntimeOutputAppearance,
  RuntimeOutputOpeningQuestions,
  RuntimeOutputVariable,
  RuntimeOutputVariablesSchema,
} from '../runtime/schema';
import type {
  Agent,
  ApiAssistant,
  AssistantBase,
  CallAssistant,
  CronFile,
  ExecuteBlock,
  ExecuteBlockSelectAll,
  ExecuteBlockSelectByPrompt,
  FunctionAssistant,
  ImageAssistant,
  Parameter,
  PromptAssistant,
  PromptMessage,
  RouterAssistant,
  SelectParameter,
  Variable,
  VariableTypeBase,
} from '.';

export type ArrayToYjs<T extends Array<{ id: string }>> = { [key: string]: { index: number; data: T[number] } };

export type VariableYjs = Omit<Variable, 'type'> & { type?: VariableTypeYjs };

export type MemoryFileYjs = {
  variables?: VariableYjs[];
};

export type ConfigFileYjs = {
  entry?: string;
};

export type CronFileYjs = CronFile;

export type FileTypeYjs =
  | AssistantYjs
  | MemoryFileYjs
  | ConfigFileYjs
  | ProjectSettings
  | CronFileYjs
  | { $base64: string };

export type AssistantYjs =
  | AgentYjs
  | PromptAssistantYjs
  | ApiAssistantYjs
  | FunctionAssistantYjs
  | ImageAssistantYjs
  | RouterAssistantYjs
  | CallAssistantYjs
  | ImageBlenderAssistantYjs;

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
        type: 'string';
        defaultValue?: string;
      }
    | {
        type: 'number';
        defaultValue?: number;
      }
    | {
        type: 'boolean';
        defaultValue?: boolean;
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

export interface RuntimeOutputVariablesSchemaYjs
  extends Omit<RuntimeOutputVariablesSchema, RuntimeOutputVariable.openingQuestions> {
  [RuntimeOutputVariable.openingQuestions]?: RuntimeOutputOpeningQuestionsYjs;
}

export interface RuntimeOutputOpeningQuestionsYjs {
  items?: ArrayToYjs<NonNullable<RuntimeOutputOpeningQuestions['items']>>;
}

export type OutputVariableYjs = VariableTypeYjs & {
  variable?: { key: string; scope: string };
  valueTemplate?: string;
  activeWhen?: string;
  from?:
    | { type?: undefined }
    | { type: 'input' | 'output'; id?: string }
    | {
        type: 'callAgent';
        callAgent?: {
          blockletDid?: string;
          projectId?: string;
          agentId?: string;
          inputs?: { [key: string]: any };
        };
      }
    | {
        type: 'variable';
        agentInstanceId?: string;
        outputVariableId?: string;
      };
  appearance?: RuntimeOutputAppearance;
  initialValue?: RuntimeOutputVariablesSchemaYjs[RuntimeOutputVariable];
};

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

export interface RouterAssistantYjs extends Omit<AssistantBaseYjs<RouterAssistant>, 'routes'> {
  routes?: ArrayToYjs<NonNullable<RouterAssistant['routes']>>;
}

export interface CallAssistantYjs extends Omit<AssistantBaseYjs<CallAssistant>, 'agents'> {
  agents?: ArrayToYjs<NonNullable<CallAssistant['agents']>>;
}

export interface ImageBlenderAssistantYjs extends AssistantBaseYjs<AssistantBase> {
  type: 'imageBlender';
  templateId?: string;
  dynamicData?: { [key: string]: string };
}

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

export type ModelBasedAssistantYjs = PromptAssistantYjs | ImageAssistantYjs;
