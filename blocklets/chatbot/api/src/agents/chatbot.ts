import chatbot from '@aigne-project/chatbot';
import { FunctionAgentDefinition, OrderedRecord, PipelineAgentDefinition, PipelineAgentProcess } from '@aigne/core';

export const convertKnowledge: FunctionAgentDefinition = {
  id: 'convert-search-result-to-knowledge',
  type: 'function_agent',
  inputs: OrderedRecord.fromArray([
    {
      id: 'search-result',
      name: 'data',
      type: 'array',
      required: true,
    },
  ]),
  outputs: OrderedRecord.fromArray([
    {
      id: 'result',
      name: 'result',
      type: 'string',
      required: true,
    },
  ]),
  language: 'javascript',
  code: `\
return {
  result: data.map((i, index) => \`[[citation:\${index + 1}]] \${i.content || i.title}\`).join('\\n'),
}
`,
};

export const chat: PipelineAgentDefinition = {
  id: 'chat',
  type: 'pipeline_agent',
  inputs: OrderedRecord.fromArray([
    {
      id: 'question',
      type: 'string',
      required: true,
    },
  ]),
  outputs: OrderedRecord.fromArray([
    {
      id: '$text',
      name: '$text',
      type: 'string',
      from: 'variable',
      fromVariableId: 'call-chatbot',
      fromVariablePropPath: ['$text'],
    },
  ]),
  processes: OrderedRecord.fromArray<PipelineAgentProcess>([
    {
      id: 'call-search-kit',
      runnable: {
        id: chatbot.agents.Search.id,
      },
      input: {
        [chatbot.agents.Search.inputs.question.id]: {
          from: 'variable',
          fromVariableId: 'question',
        },
      },
    },
    {
      id: 'convert-search-result-to-knowledge',
      runnable: {
        id: 'convert-search-result-to-knowledge',
      },
      input: {
        'search-result': {
          from: 'variable',
          fromVariableId: 'call-search-kit',
          fromVariablePropPath: ['list'],
        },
      },
    },
    {
      id: 'call-chatbot',
      runnable: {
        id: chatbot.agents.Chatbot.id,
      },
      input: {
        [chatbot.agents.Chatbot.inputs.question.id]: {
          from: 'variable',
          fromVariableId: 'question',
        },
        [chatbot.agents.Chatbot.inputs.searchResult.id]: {
          from: 'variable',
          fromVariableId: 'convert-search-result-to-knowledge',
          fromVariablePropPath: ['result'],
        },
      },
    },
  ]),
};
