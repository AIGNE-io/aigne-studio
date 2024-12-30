import chatbot from '@aigne-project/chatbot';
import { FunctionAgent, LLMAgent, LLMDecisionAgent, LocalFunctionAgent, PipelineAgent } from '@aigne/core';
import { Memory } from '@aigne/memory';

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

export const chatbotLLMAgent = LLMAgent.create({
  inputs: [
    {
      name: 'question',
      type: 'string',
      required: true,
    },
    {
      name: 'userMemory',
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
  modelSettings: {
    model: 'gpt-4o-mini',
  },
  messages: [
    {
      role: 'system',
      content:
        'You are a professional assistant. Please answer the question based on the context.\n your memory about the user: {{userMemory}}',
    },
    {
      role: 'user',
      content: '{{question}}',
    },
  ],
});

const memory = Memory.load({ path: '/tmp/chatbot-memory-17' });

export const memorySearchAgent = LocalFunctionAgent.create<{ question: string }, { memory: string }>({
  inputs: [{ name: 'question', type: 'string', required: true }],

  outputs: [{ name: 'memory', type: 'string', required: true }],

  function: async (input) => {
    const m = await (await memory).search(input.question, { k: 5 });
    console.log('search memory results', input, m);
    return { memory: m.results.map((i) => i.memory).join('\n') };
  },
});

export const memoryUpdateAgent = LocalFunctionAgent.create<
  { question: string; memory: string; answer: string },
  { memory: string }
>({
  inputs: [
    { name: 'question', type: 'string', required: true },
    { name: 'memory', type: 'string', required: true },
    { name: 'answer', type: 'string', required: true },
  ],

  outputs: [{ name: 'memory', type: 'string', required: true }],

  function: async (input) => {
    const m = await (
      await memory
    ).add([
      { role: 'system', content: `memory about user: ${input.memory}` },
      { role: 'user', content: input.question },
      { role: 'assistant', content: input.answer },
    ]);

    const all = await (await memory).filter({ k: 100 });

    console.log('add memory results', m.results, all);

    return { memory: all.map((i) => i.memory).join('\n') };
  },
});

export const chatbotAgent = PipelineAgent.create({
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
      fromVariable: 'call-other-question-bot',
    },
    {
      name: 'usedMemory',
      type: 'string',
      fromVariable: 'get-user-memory',
      fromVariablePropPath: ['memory'],
    },
    {
      name: 'allMemory',
      type: 'string',
      fromVariable: 'add-memory',
      fromVariablePropPath: ['memory'],
    },
  ],
  processes: [
    {
      name: 'get-user-memory',
      runnable: memorySearchAgent,
      input: {
        question: {
          fromVariable: 'question',
        },
      },
    },
    {
      name: 'call-other-question-bot',
      runnable: chatbotLLMAgent,
      input: {
        question: {
          fromVariable: 'question',
        },
        userMemory: {
          fromVariable: 'get-user-memory',
          fromVariablePropPath: ['memory'],
        },
      },
    },
    {
      name: 'add-memory',
      runnable: memoryUpdateAgent,
      input: {
        question: {
          fromVariable: 'question',
        },
        memory: {
          fromVariable: 'get-user-memory',
          fromVariablePropPath: ['memory'],
        },
        answer: {
          fromVariable: 'call-other-question-bot',
          fromVariablePropPath: ['$text'],
        },
      },
    },
  ],
});

export const chat = LLMDecisionAgent.create({
  id: 'chat',
  inputs: [{ name: 'question', type: 'string', required: true }],
  messages: `\
You are a professional question classifier. Please classify the question and
choose the right bot to answer it.

Rules to classify the question:

document-query-assistant:
- If the question is about a document, such as aigne, discuss kit, task, company info, arcblock, blocklet ...

chat-bot:
- If the question is normal chat, such as how are you, what's your name, what's the weather today, I am xxx, I want xxx...
- If the question is about user's self, such as my name is xxx, I am xxx, I want xxx, I like to xxx...

question: {{question}}
`,
  cases: [
    {
      name: 'document-query-assistant',
      runnable: docBot,
      input: {
        question: { fromVariable: 'question' },
      },
    },
    {
      name: 'chat-bot',
      runnable: chatbotAgent,
      input: {
        question: { fromVariable: 'question' },
      },
    },
  ],
});
