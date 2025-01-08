import { LLMAgent, LocalFunctionAgent, PipelineAgent } from '@aigne/core';

import { DEFAULT_MODEL } from '../../libs/const';
import { getDefaultValue } from '../../libs/default-value';

export const currentModelFunctionAgent = LocalFunctionAgent.create<{}, { $text: string }>({
  name: 'currentModelFunctionAgent',
  inputs: [],
  outputs: [
    {
      name: '$text',
      type: 'string',
      required: true,
    },
  ],
  async function(_input, { context }) {
    const { llmModel } = context.config;
    const model = getDefaultValue('model', llmModel?.override, llmModel?.default) || DEFAULT_MODEL;

    return {
      $text: model,
    };
  },
});

export const currentModelLLMAgent = LLMAgent.create<
  { question: string; model: string; language?: string },
  { $text: string }
>({
  name: 'currentModelLLMAgent',
  inputs: [
    {
      name: 'question',
      type: 'string',
      required: true,
    },
    {
      name: 'model',
      type: 'string',
      required: true,
    },
    {
      name: 'language',
      type: 'string',
    },
  ],
  outputs: [
    {
      name: '$text',
      type: 'string',
      required: true,
    },
  ],
  modelOptions: {
    model: 'gpt-4o-mini',
    temperature: 0,
  },
  messages: [
    {
      role: 'system',
      content: `\
You must use {{language}} to reply to the user's question.

## Current model
{{model}}
`,
    },
    {
      role: 'user',
      content: '{{question}}',
    },
  ],
});

export const getCurrentModelPipelineAgent = PipelineAgent.create<
  { question: string; language: string },
  { $text: string }
>({
  name: 'getCurrentModelPipelineAgent',
  inputs: [
    {
      name: 'question',
      type: 'string',
      required: true,
    },
    {
      name: 'language',
      type: 'string',
    },
  ],
  processes: [
    {
      name: 'currentModelFunctionAgent',
      runnable: currentModelFunctionAgent,
    },
    {
      name: 'currentModelLLMAgent',
      runnable: currentModelLLMAgent,
      input: {
        question: { fromVariable: 'question' },
        model: { fromVariable: 'currentModelFunctionAgent', fromVariablePropPath: ['$text'] },
        language: { fromVariable: 'language' },
      },
    },
  ],
  outputs: [
    {
      name: '$text',
      type: 'string',
      fromVariable: 'currentModelLLMAgent',
      fromVariablePropPath: ['$text'],
    },
  ],
});
