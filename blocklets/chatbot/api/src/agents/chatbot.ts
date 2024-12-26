import chatbot from '@aigne-project/chatbot';
import { FunctionAgent, LLMDecisionAgent, PipelineAgent } from '@aigne/core';

export const convertKnowledge = FunctionAgent.create({
  inputs: [
    {
      name: 'data',
      type: 'array',
      required: true,
    },
  ],
  outputs: [
    {
      name: 'result',
      type: 'string',
      required: true,
    },
  ],
  language: 'javascript',
  code: `\
return {
  result: data.map((i, index) => \`[[citation:\${index + 1}]] \${i.content || i.title}\`).join('\\n'),
}
`,
});

export const docBot = PipelineAgent.create({
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
      fromVariable: 'call-chatbot',
      fromVariablePropPath: ['$text'],
    },
  ],
  processes: [
    {
      name: 'call-search-kit',
      runnable: chatbot.agents.Search,
      input: {
        question: {
          fromVariable: 'question',
        },
      },
    },
    {
      name: 'convert-search-result-to-knowledge',
      runnable: convertKnowledge,
      input: {
        data: {
          fromVariable: 'call-search-kit',
          fromVariablePropPath: ['list'],
        },
      },
    },
    {
      name: 'call-chatbot',
      runnable: chatbot.agents.Chatbot,
      input: {
        question: {
          fromVariable: 'question',
        },
        searchResult: {
          fromVariable: 'convert-search-result-to-knowledge',
          fromVariablePropPath: ['result'],
        },
      },
    },
  ],
});

export const otherQuestionBot = FunctionAgent.create({
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
  language: 'javascript',
  code: `\
return {
  $text: 'Sorry, I cannot answer this question. Please ask another question.',
};
`,
});

export const chat = LLMDecisionAgent.create({
  id: 'chat',
  inputs: [{ name: 'question', type: 'string', required: true }],
  messages:
    'You are a professional question classifier. Please classify the question and choose the right bot to answer it.\n question: {{question}}',
  cases: [
    {
      name: 'doc-bot',
      runnable: docBot,
      input: {
        question: { fromVariable: 'question' },
      },
    },
    {
      name: 'other-question-bot',
      runnable: otherQuestionBot,
      input: {
        question: { fromVariable: 'question' },
      },
    },
  ],
});
