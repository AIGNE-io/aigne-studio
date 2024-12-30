import { RunOptions, Runnable, RunnableResponse, RunnableResponseStream } from './runnable';
import { OrderedRecord } from './utils';

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface LLMModelInputs {
  messages: {
    role: Role;

    // complex content only supported for role === 'user'
    content: string | ({ type: 'text'; text: string } | { type: 'image_url'; imageUrl: string })[];

    // for role === 'assistant'
    toolCalls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[];

    // for role === 'tool'
    toolCallId?: string;
  }[];

  responseFormat?:
    | { type: 'text' }
    | {
        type: 'json_schema';
        jsonSchema: {
          name: string;
          description?: string;
          schema: object;
          strict?: boolean;
        };
      };

  tools?: {
    type: 'function';
    function: {
      name: string;
      description?: string;
      parameters: object;
    };
  }[];

  toolChoice?: 'auto' | 'none' | 'required' | { type: 'function'; function: { name: string; description?: string } };

  modelSettings?: {
    model?: string;
    temperature?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
}

export interface LLMModelOutputs {
  $text?: string | null;
  toolCalls?: {
    id?: string;
    type?: 'function';
    function?: {
      name?: string;
      arguments?: string;
    };
  }[];
}

export abstract class LLMModel extends Runnable<LLMModelInputs, LLMModelOutputs> {
  constructor() {
    super({
      id: 'llm_model',
      type: 'llm_model',
      name: 'LLM Model',
      description: 'Run a LLM model',
      inputs: OrderedRecord.fromArray([
        { id: 'messages', name: 'messages', type: 'array', required: true },
        { id: 'responseFormat', name: 'responseFormat', type: 'object' },
        { id: 'tools', name: 'tools', type: 'array' },
        { id: 'toolChoice', name: 'toolChoice', type: 'object' },
        { id: 'modelSettings', name: 'modelSettings', type: 'object' },
      ]),
      outputs: OrderedRecord.fromArray([
        { id: '$text', name: '$text', type: 'string' },
        { id: 'toolCalls', name: 'toolCalls', type: 'object' },
      ]),
    });
  }

  abstract run(
    input: LLMModelInputs,
    options: RunOptions & { stream: true }
  ): Promise<RunnableResponseStream<LLMModelOutputs>>;
  abstract run(input: LLMModelInputs, options?: RunOptions & { stream?: false }): Promise<LLMModelOutputs>;
  abstract run(input: LLMModelInputs, options?: RunOptions): Promise<RunnableResponse<LLMModelOutputs>>;
}
