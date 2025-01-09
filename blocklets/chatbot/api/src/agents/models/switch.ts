import { LLMAgent, LocalFunctionAgent, PipelineAgent } from '@aigne/core';
import { SessionUser } from '@blocklet/sdk/lib/util/login';

import { userPreferences } from '../memory';
import { getAllModelsFunctionAgent } from './find';

export const extractModelFromQuestion = LLMAgent.create<{ question: string; models: string }, { model: string }>({
  name: 'extractModelFromQuestion',
  inputs: [
    {
      name: 'question',
      type: 'string',
      required: true,
    },
    {
      name: 'models',
      type: 'string',
      required: true,
    },
  ],
  outputs: [
    {
      name: 'model',
      type: 'string',
      description: 'Model name user wants to switch to, return empty string if not found',
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
Get the model name user wants to switch to from the question.

## Available model names
{{models}}

## User's question
{{question}}
`,
    },
  ],
});

export const switchModelFunctionAgent = LocalFunctionAgent.create<
  { model: string; models: string },
  { $text: string },
  { user: SessionUser }
>({
  name: 'switchModelFunctionAgent',
  inputs: [
    {
      name: 'model',
      type: 'string',
    },
    {
      name: 'models',
      type: 'string',
      required: true,
    },
  ],
  outputs: [
    {
      name: '$text',
      type: 'string',
      required: true,
    },
  ],
  async function(input, { context }) {
    const models = input.models.split(',');
    if (!input.model) {
      return {
        $text: `请提供需要切换的 AI 模型, 可用的模型有: ${input.models}`,
      };
    }

    if (!models.includes(input.model)) {
      return {
        $text: `模型 ${input.model} 不存在, 可用的模型有: ${input.models}`,
      };
    }

    const { did: userId } = context.state.user;
    await userPreferences.then((m) => m.setByKey('model', { model: input.model }, { userId }));

    return {
      $text: `模型切换成功, AI模型已切换为 ${input.model}`,
    };
  },
});

export const switchModelLLMAgent = LLMAgent.create<
  { result: string; question: string; language?: string },
  { $text: string }
>({
  name: 'switchModelLLMAgent',
  inputs: [
    {
      name: 'result',
      type: 'string',
      required: true,
    },
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
  outputs: [
    {
      name: '$text',
      type: 'string',
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
You are a message response assistant.
You must use {{language}} to answer user questions based on the results.

## Switch model result
{{result}}

## User's question
{{question}}
`,
    },
  ],
});

export const switchModelPipelineAgent = PipelineAgent.create<
  { question: string; language?: string },
  { $text: string }
>({
  name: 'switchModelPipelineAgent',
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
      name: 'getAllModelsFunctionAgent',
      runnable: getAllModelsFunctionAgent,
    },
    {
      name: 'extractModelFromQuestion',
      runnable: extractModelFromQuestion,
      input: {
        question: { fromVariable: 'question' },
        models: { fromVariable: 'getAllModelsFunctionAgent', fromVariablePropPath: ['$text'] },
      },
    },
    {
      name: 'switchModelFunctionAgent',
      runnable: switchModelFunctionAgent,
      input: {
        model: { fromVariable: 'extractModelFromQuestion', fromVariablePropPath: ['model'] },
        models: { fromVariable: 'getAllModelsFunctionAgent', fromVariablePropPath: ['$text'] },
      },
    },
    {
      name: 'switchModelLLMAgent',
      runnable: switchModelLLMAgent,
      input: {
        result: { fromVariable: 'switchModelFunctionAgent', fromVariablePropPath: ['$text'] },
        question: { fromVariable: 'question' },
        language: { fromVariable: 'language' },
      },
    },
  ],
  outputs: [
    {
      name: '$text',
      type: 'string',
      fromVariable: 'switchModelLLMAgent',
      fromVariablePropPath: ['$text'],
    },
  ],
});
