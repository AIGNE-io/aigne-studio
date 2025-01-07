import { LLMAgent, LocalFunctionAgent, PipelineAgent } from '@aigne/core';
import { ResourceManager } from '@blocklet/ai-runtime/common/resource-manager';

async function getAdapter(type: 'llm' | 'image-generation') {
  const resourceManager = new ResourceManager();
  const projects = await resourceManager.getProjects({
    type: type === 'image-generation' ? 'aigc-adapter' : 'llm-adapter',
  });

  return projects.flatMap((x) => {
    return x.agents.map((y) => ({
      blockletDid: x.blocklet.did,
      projectId: x.project.id,
      agent: y,
    }));
  });
}
console.log(JSON.stringify(getAdapter('llm'), null, 2));

export const getAllModelsFunctionAgent = LocalFunctionAgent.create<{}, { $text: string }>({
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
      $text: `['gpt-4o-mini', 'gpt-4o-mini-preview', 'gpt-4o-mini-preview-2024-01-18']`,
    };
  },
});

export const findAllModelLLMAgent = LLMAgent.create<{ model: string[]; language?: string }, { $text: string }>({
  inputs: [
    {
      name: 'models',
      type: 'array',
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
			You must use the following models to reply to the user's question: {{models}}.
			`,
    },
    {
      role: 'user',
      content: `Please introduce each model and manufacturer, and note that the structure is k:v

Example:
当前存在模型:
gpt-4o-mini: OpenAI
gpt-4o-mini-preview: OpenAI
gpt-4o-mini-preview-2024-01-18: OpenAI
`,
    },
  ],
});

export const findAllModelPipelineAgent = PipelineAgent.create<{ language: string }, { $text: string }>({
  name: 'findAllModelPipelineAgent',
  inputs: [
    {
      name: 'language',
      type: 'string',
    },
  ],
  processes: [
    {
      name: 'findAllModel',
      runnable: getAllModelsFunctionAgent,
    },
    {
      name: 'findAllModelLLM',
      runnable: findAllModelLLMAgent,
      input: {
        models: { fromVariable: 'findAllModel', fromVariablePropPath: ['$text'] },
        language: { fromVariable: 'language' },
      },
    },
  ],
  outputs: [
    {
      name: '$text',
      type: 'string',
      fromVariable: 'findAllModelLLM',
      fromVariablePropPath: ['$text'],
    },
  ],
});
