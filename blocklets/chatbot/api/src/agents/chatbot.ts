import chatbot from '@aigne-project/chatbot';
import {
  FunctionAgentDefinition,
  LLMDecisionAgentDefinition,
  OrderedRecord,
  PipelineAgentDefinition,
  PipelineAgentProcess,
} from '@aigne/core';

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

export const docBot: PipelineAgentDefinition = {
  id: 'doc-bot',
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

export const otherQuestionBot: FunctionAgentDefinition = {
  id: 'other-question-bot',
  type: 'function_agent',
  inputs: OrderedRecord.fromArray([
    {
      id: 'question',
      name: 'question',
      type: 'string',
      required: true,
    },
  ]),
  outputs: OrderedRecord.fromArray([
    {
      id: '$text',
      name: '$text',
      type: 'string',
      required: true,
    },
  ]),
  language: 'javascript',
  code: `\
return {
  $text: 'Sorry, I cannot answer this question. Please ask another question.',
};
`,
};

export const chat: LLMDecisionAgentDefinition = {
  id: 'chat',
  type: 'llm_decision_agent',
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
    },
  ]),
  modelSettings: {
    model: 'gpt-4o-mini',
  },
  messages: OrderedRecord.fromArray([
    {
      id: 'system',
      role: 'system',
      content:
        'You are a professional question classifier. Please classify the question and choose the right bot to answer it.\n question: {{question}}',
    },
  ] as const),
  cases: OrderedRecord.fromArray([
    {
      id: 'doc-bot',
      name: 'doc-bot',
      runnable: {
        id: 'doc-bot',
      },
      input: {
        question: {
          from: 'variable',
          fromVariableId: 'question',
        },
      },
    },
    {
      id: 'other-question-bot',
      name: 'other-question-bot',
      runnable: {
        id: 'other-question-bot',
      },
      input: {
        question: {
          from: 'variable',
          fromVariableId: 'question',
        },
      },
    },
  ] as const),
};
