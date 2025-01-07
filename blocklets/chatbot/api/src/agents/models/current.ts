import chatbot from '@aigne-project/chatbot';
import { LLMAgent, LLMModelConfiguration, LocalFunctionAgent, PipelineAgent, TYPES } from '@aigne/core';

export const currentModelFunctionAgent = LocalFunctionAgent.create<{}, { $text: string }>({
  inputs: [],
  outputs: [
    {
      name: '$text',
      type: 'string',
      required: true,
    },
  ],
  async function() {
    const model = chatbot.container.resolve<{ config: LLMModelConfiguration }>(TYPES.llmModel);

    return {
      $text: model.config.override?.model || model.config.default?.model || 'gpt-4o-mini',
    };
  },
});

export const currentModelLLMAgent = LLMAgent.create<{ model: string; language?: string }, { $text: string }>({
  inputs: [
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
      content: "You must use {{language}} to reply to the user's question.",
    },
    {
      role: 'user',
      content: 'Get the current model is: "{{model}}"',
    },
  ],
});

export const currentModelPipelineAgent = PipelineAgent.create<{ language: string }, { $text: string }>({
  name: 'currentModelPipelineAgent',
  inputs: [
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
