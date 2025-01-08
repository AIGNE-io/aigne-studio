import { LLMAgent, LocalFunctionAgent, PipelineAgent } from '@aigne/core';
import { ResourceManager } from '@blocklet/ai-runtime/common/resource-manager';
import { SelectParameter } from '@blocklet/ai-runtime/types';
import { uniq } from 'lodash';

import { DEFAULT_MODEL } from '../../libs/const';

async function getAdapter() {
  const resourceManager = new ResourceManager();
  const projects = await resourceManager.getProjects({ type: 'llm-adapter' });

  return projects
    .flatMap((x) => x.agents)
    .flatMap((y) => (y.parameters?.find((i) => i.key === 'model') as SelectParameter)?.options?.map((v) => v.value));
}

export const getAllModelsFunctionAgent = LocalFunctionAgent.create<{}, { $text: string }>({
  name: 'getAllModelsFunctionAgent',
  inputs: [],
  outputs: [
    {
      name: '$text',
      type: 'string',
      required: true,
    },
  ],
  async function() {
    const models = uniq([DEFAULT_MODEL, ...(await getAdapter())]);

    return {
      $text: models.join(','),
    };
  },
});

export const getAllModelsLLMAgent = LLMAgent.create<
  { question: string; models: string; language?: string },
  { $text: string }
>({
  name: 'getAllModelsLLMAgent',
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

## You must use the following models to reply to the user's question:
{{models}}.

## Example:
current supported models:\n
gpt-4o-mini: OpenAI\n
gpt-4o-mini-preview: OpenAI\n
gpt-4o-mini-preview-2024-01-18: OpenAI
`,
    },
    {
      role: 'user',
      content: '{{question}}',
    },
  ],
});

export const getAllModelsPipelineAgent = PipelineAgent.create<
  { question: string; language: string },
  { $text: string }
>({
  name: 'getAllModelsPipelineAgent',
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
      name: 'getAllModelsLLMAgent',
      runnable: getAllModelsLLMAgent,
      input: {
        question: { fromVariable: 'question' },
        models: { fromVariable: 'getAllModelsFunctionAgent', fromVariablePropPath: ['$text'] },
        language: { fromVariable: 'language' },
      },
    },
  ],
  outputs: [
    {
      name: '$text',
      type: 'string',
      fromVariable: 'getAllModelsLLMAgent',
      fromVariablePropPath: ['$text'],
    },
  ],
});
