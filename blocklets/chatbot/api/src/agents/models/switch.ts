import { LLMAgent, LLMDecisionAgent, LocalFunctionAgent, PipelineAgent } from '@aigne/core';

import { userPreferences } from '../memory';
import { getAllModelsFunctionAgent } from './find';

export const needInputModelFunctionAgent = LocalFunctionAgent.create<{}, { $text: string }>({
  inputs: [],
  outputs: [
    {
      name: '$text',
      type: 'string',
      required: true,
    },
  ],
  async function() {
    return {
      $text: '需要提供需要切换的 AI 模型, 例如: "切换到 gpt-4o-mini"',
    };
  },
});

export const extractQuestionModelLLMAgent = LLMAgent.create<{ question: string }, { $text: string }>({
  inputs: [
    {
      name: 'question',
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
  modelOptions: {
    model: 'gpt-4o-mini',
    temperature: 0,
  },
  messages: [
    {
      role: 'system',
      content: `\
You are a helpful assistant.
You need to extract the current model from the current user's question.
\
## Example
Question: "Switch to XXX model",
Answer: "XXX",
`,
    },
    {
      role: 'user',
      content: '{{question}}',
    },
  ],
});

export const needSelectModelFunctionAgent = LocalFunctionAgent.create<{ models: string[] }, { $text: string }>({
  inputs: [
    {
      name: 'models',
      type: 'array',
    },
  ],
  outputs: [
    {
      name: '$text',
      type: 'string',
    },
  ],
  async function(input) {
    return {
      $text: `请从 ${input.models.join(', ')} 中选择一个模型`,
    };
  },
});

export const switchModelFunctionAgent = LocalFunctionAgent.create<{ model: string }, { $text: string }>({
  inputs: [
    {
      name: 'model',
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
  async function(input, { context }: any) {
    const { did: userId } = context.state.user;
    await userPreferences.then((m) => m.setByKey('model', { model: input.model }, { userId }));

    return {
      $text: `AI模型已切换为 ${input.model}`,
    };
  },
});

export const checkModelClassification = LLMDecisionAgent.create<{ model: string; models: string[] }, { $text: string }>(
  {
    name: 'checkModelClassification',
    inputs: [
      {
        name: 'model',
        type: 'string',
        required: true,
      },
      {
        name: 'models',
        type: 'array',
        required: true,
      },
    ],
    messages: `\
You are a professional question classifier. Please help me determine if the contents of the model exist in the models and choose the right case to answer it.
\
## model
{{model}}
\
## models
{{models}}
`,
    modelOptions: {
      model: 'gpt-4o-mini',
      temperature: 0,
    },
    cases: [
      {
        name: 'model-in-models',
        description: 'model is required, and the model exists in the models',
        runnable: switchModelFunctionAgent,
        input: {
          model: { fromVariable: 'model' },
        },
      },
      {
        name: 'model-not-in-models',
        description: 'The model does not exist in the models',
        runnable: needSelectModelFunctionAgent,
        input: {
          models: { fromVariable: 'models' },
        },
      },
    ],
  },
);

export const checkModelPipelineAgent = PipelineAgent.create<{ question: string }, { $text: string }>({
  name: 'checkModelPipelineAgent',
  inputs: [
    {
      name: 'question',
      type: 'string',
      required: true,
    },
  ],
  processes: [
    {
      name: 'extractQuestionModelLLMAgent',
      runnable: extractQuestionModelLLMAgent,
      input: {
        question: { fromVariable: 'question' },
      },
    },
    {
      name: 'getAllModelsFunctionAgent',
      runnable: getAllModelsFunctionAgent,
    },
    {
      name: 'checkModelClassification',
      runnable: checkModelClassification,
      input: {
        model: { fromVariable: 'extractQuestionModelLLMAgent', fromVariablePropPath: ['$text'] },
        models: { fromVariable: 'getAllModelsFunctionAgent', fromVariablePropPath: ['$text'] },
      },
    },
  ],
  outputs: [
    {
      name: '$text',
      type: 'string',
      fromVariable: 'checkModelClassification',
      fromVariablePropPath: ['$text'],
    },
  ],
});

export const extractModelClassification = LLMDecisionAgent.create<{ question: string }, { $text: string }>({
  name: 'extractModelClassification',
  inputs: [
    {
      name: 'question',
      type: 'string',
      required: true,
    },
  ],
  messages: `\
You are a professional question classifier. Please judge whether the user's input question contains an AI model and choose the right case to answer it.
\
## User's question
{{question}}
`,
  modelOptions: {
    model: 'gpt-4o-mini',
    temperature: 0,
  },
  cases: [
    {
      name: 'has-ai-model',
      description: 'The AI Model can be extracted from the question',
      runnable: checkModelPipelineAgent,
      input: {
        question: { fromVariable: 'question' },
      },
    },
    {
      name: 'no-input-ai-model',
      description: 'No input AI model',
      runnable: needInputModelFunctionAgent,
    },
  ],
});

export const switchModelLLMAgent = LLMAgent.create<{ question: string; language?: string }, { $text: string }>({
  name: 'switchModelLLMAgent',
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
You are a helpful assistant.
You must use {{language}} to reply to the user's question.
`,
    },
    {
      role: 'user',
      content: '{{question}}',
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
      name: 'extractModelClassification',
      runnable: extractModelClassification,
      input: {
        question: { fromVariable: 'question' },
      },
    },
    {
      name: 'switchModelLLMAgent',
      runnable: switchModelLLMAgent,
      input: {
        question: { fromVariable: 'extractModelClassification', fromVariablePropPath: ['$text'] },
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
