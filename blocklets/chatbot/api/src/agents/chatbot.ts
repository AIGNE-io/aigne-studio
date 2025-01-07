import chatbot from '@aigne-project/chatbot';
import { LLMAgent, LLMDecisionAgent, LocalFunctionAgent, PipelineAgent } from '@aigne/core';
// import { Runtime } from '@aigne/runtime';
import { SessionUser } from '@blocklet/sdk/lib/util/login';
import { differenceBy, orderBy } from 'lodash';

import { extractKeywordsAgent, knowledgeAgent } from './knowledge';
import { longTermMemory, shortTermMemory } from './memory';
import { currentModelFunctionAgent, currentModelLLMAgent, currentModelPipelineAgent } from './models/current';
import { findAllModelLLMAgent, findAllModelPipelineAgent, getAllModelsFunctionAgent } from './models/find';
import {
  extractQuestionModelLLMAgent,
  switchModelFunctionAgent,
  switchModelLLMAgent,
  switchModelPipelineAgent,
} from './models/switch';
import { ChatbotResponse } from './type';

chatbot.setup({
  llmModel: {
    default: {
      temperature: 0.2,
    },
    override: {
      model: 'gemini-1.5-pro',
    },
  },
});

export const docAgent = LocalFunctionAgent.create<
  {
    question: string;
    memory?: string;
    language?: string;
  },
  ChatbotResponse
>({
  inputs: [
    {
      name: 'memory',
      type: 'string',
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
  async function(input, { context }) {
    return new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue({
            delta: { status: { loading: true, message: 'The document assistant has received your request...' } },
          });

          const knowledgeStream = await (
            await context.resolve<typeof knowledgeAgent>(knowledgeAgent.id)
          ).run({ question: input.question }, { stream: true });

          let knowledge: { id: string; url: string; title: string; content?: string }[] | undefined;

          for await (const chunk of knowledgeStream) {
            if (chunk.delta?.list) knowledge = chunk.delta?.list;
            if (chunk.delta?.status) controller.enqueue({ delta: { status: chunk.delta.status } });

            controller.enqueue({ delta: { relatedDocuments: knowledge } });
          }

          if (knowledge) controller.enqueue({ delta: { relatedDocuments: knowledge } });

          const stream = await (context as typeof chatbot).agents.DocumentAgent.run(
            {
              language: input.language,
              question: input.question,
              memory: input.memory,
              knowledge: knowledge?.map((i, index) => `[citation:${index + 1}] ${i.title}. ${i.content}`).join('\n'),
            },
            { stream: true },
          );

          for await (const chunk of stream) {
            controller.enqueue({ delta: { status: { loading: false } } });
            controller.enqueue(chunk);
          }
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });
  },
});

export const chatLLMAgent = LLMAgent.create<
  { question: string; memory?: string; language?: string },
  { $text: string }
>({
  inputs: [
    {
      name: 'memory',
      type: 'string',
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
      required: true,
    },
  ],
  modelOptions: {
    model: 'gpt-4o-mini',
  },
  messages: [
    {
      role: 'system',
      content: `\
You are a professional chatbot from ArcBlock and serve the users in the ArcBlock Team.

## Features
- You can answer questions about ArcBlock products and services.
- You can query the documents from the ArcBlock Team site for the users.

## Rules
- You must use {{language}} to answer the user's question.

{{memory}}
`,
    },
    {
      role: 'user',
      content: '{{question}}',
    },
  ],
});

export const chatAgent = LocalFunctionAgent.create<
  { question: string; memory?: string; language?: string },
  ChatbotResponse
>({
  inputs: [
    {
      name: 'memory',
      type: 'string',
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
  async function(input, { context }) {
    return new ReadableStream({
      async start(controller) {
        try {
          const stream = await (
            await context.resolve(chatLLMAgent.id)
          ).run(
            {
              memory: input.memory,
              question: input.question,
              language: input.language,
            },
            { stream: true },
          );

          for await (const chunk of stream) {
            controller.enqueue({ delta: { status: { loading: false } } });
            controller.enqueue(chunk);
          }

          controller.enqueue({ delta: { status: { loading: false } } });
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });
  },
});

export const cleanMemoryAgent = LocalFunctionAgent.create<{}, ChatbotResponse>({
  inputs: [],
  outputs: [
    {
      name: '$text',
      type: 'string',
    },
  ],
  async function() {
    await Promise.all([(await longTermMemory).reset(), (await shortTermMemory).reset()]);
    return { $text: 'Memory has been cleaned.' };
  },
});

export const cleanMemoryLLMAgent = LLMAgent.create<
  {
    question: string;
    language?: string;
  },
  ChatbotResponse
>({
  name: 'cleanMemoryLLMAgent',
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
      required: true,
    },
  ],
  modelOptions: {
    model: 'gpt-4o-mini',
  },
  messages: [
    {
      role: 'system',
      content: `\
Clean Memory Result: Memory has been cleaned.

You must use {{language}} to reply to the user's question.
`,
    },
    {
      role: 'user',
      content: '{{question}}',
    },
  ],
});

export const cleanMemoryPipeline = PipelineAgent.create<
  {
    question: string;
    language: string;
  },
  ChatbotResponse
>({
  name: 'cleanMemoryPipeline',
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
      name: 'cleanMemory',
      runnable: cleanMemoryAgent,
    },
    {
      name: 'cleanMemoryLLM',
      runnable: cleanMemoryLLMAgent,
      input: {
        question: { fromVariable: 'question' },
        language: { fromVariable: 'language' },
      },
    },
  ],
  outputs: [
    {
      name: '$text',
      type: 'string',
      fromVariable: 'cleanMemoryLLM',
      fromVariablePropPath: ['$text'],
    },
  ],
});

export const questionClassification = LLMDecisionAgent.create<
  { memory: string; question: string; language?: string },
  ChatbotResponse
>({
  name: 'questionClassification',
  inputs: [
    {
      name: 'memory',
      type: 'string',
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
  messages: `\
You are a professional question classifier. Please classify the question and choose the right case to answer it.

{{memory}}

## User's question
{{question}}
`,
  modelOptions: {
    model: 'gpt-4o-mini',
    temperature: 0,
  },
  cases: [
    {
      name: 'document-assistant',
      description: 'Answer questions about the documents or technical issues or other unknown questions.',
      runnable: docAgent,
      input: {
        memory: { fromVariable: 'memory' },
        question: { fromVariable: 'question' },
        language: { fromVariable: 'language' },
      },
    },
    {
      name: 'chatbot-profile-assistant',
      description:
        'Answer questions about the chatbot self or user self, like name, from, features, functions, favorites, etc.',
      runnable: chatAgent,
      input: {
        memory: { fromVariable: 'memory' },
        question: { fromVariable: 'question' },
        language: { fromVariable: 'language' },
      },
    },
    // {
    //   name: 'google-search',
    //   description: 'Search the question on Google and return the search results',
    //   runnable: chatbot.agents['Google Search'],
    //   input: {
    //     question: { fromVariable: 'question' },
    //   },
    // },
    {
      name: 'clean-memory',
      description: 'Clean the memory',
      runnable: cleanMemoryPipeline,
      input: {
        question: { fromVariable: 'question' },
        language: { fromVariable: 'language' },
      },
    },
    {
      name: 'get-current-model',
      description: 'Get the current model',
      runnable: currentModelPipelineAgent,
      input: {
        language: { fromVariable: 'language' },
      },
    },
    {
      name: 'find-all-models',
      description: 'Find all models',
      runnable: findAllModelPipelineAgent,
      input: {
        language: { fromVariable: 'language' },
      },
    },
    {
      name: 'switch-model',
      description: 'Switch the model',
      runnable: switchModelPipelineAgent,
      input: {
        question: { fromVariable: 'question' },
        language: { fromVariable: 'language' },
      },
    },
  ],
});

export const questionAnalyzeAgent = LLMAgent.create<{ question: string }, { language: string }>({
  name: 'questionAnalyze',
  inputs: [
    {
      name: 'question',
      type: 'string',
      required: true,
    },
  ],
  outputs: [
    {
      name: 'language',
      description: 'The language of the question',
      type: 'string',
      required: true,
    },
  ],
  modelOptions: {
    model: 'gpt-4o-mini',
    temperature: 0.2,
  },
  messages: [
    {
      role: 'system',
      content: `\
You are a professional question analyzer, proficient in analyzing the language of the question.

Please analyze the language of the question below:
{{question}}
`,
    },
  ],
});

export const chat = LocalFunctionAgent.create<{ question: string }, ChatbotResponse, { user: SessionUser }>({
  name: 'chat',
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
    },
  ],
  function: async (input, { context }) => {
    return new ReadableStream({
      async start(controller) {
        let $text = '';
        const { did: userId } = context.state.user;

        try {
          // const mode = await userPreferences.then((m) => m.getByKey('model', { userId }));
          // if (mode?.memory?.model) {
          //   (context as any as Runtime).setup({
          //     llmModel: {
          //       override: {
          //         model: mode?.memory?.model,
          //       },
          //     },
          //   });
          // }

          const [ltm, stm] = await Promise.all([longTermMemory, shortTermMemory]);

          controller.enqueue({ delta: { status: { loading: true, message: 'Querying memory...' } } });

          const [longTermMem, shortTermMem, { language }] = await Promise.all([
            Promise.all([
              ltm.search(input.question, { k: 4, userId }),
              ltm.filter({ k: 6, userId, sort: { field: 'createdAt', direction: 'desc' } }),
            ]).then(([{ results: match }, { results: last }]) => {
              const list = orderBy([...differenceBy(match, last, (i) => i.id), ...last], (i) => i.createdAt, 'asc');
              return list.map((i) => `${i.metadata.role}: ${i.memory}`).join('\n');
            }),
            stm.search(input.question, { k: 8, userId }).then((res) => res.results.map((j) => j.memory).join('\n')),
            context
              .resolve<typeof questionAnalyzeAgent>(questionAnalyzeAgent.id)
              .then((agent) => agent.run({ question: input.question })),
          ]);

          controller.enqueue({ delta: { usedMemory: shortTermMem } });

          const memory = `
## Here are the conversation history
${longTermMem}

## Here are some memory about the user
${shortTermMem}
`;

          controller.enqueue({ delta: { status: { loading: true, message: 'Classifying the question...' } } });

          const stream = await (
            await context.resolve<typeof questionClassification>(questionClassification.id)
          ).run(
            {
              memory,
              question: input.question,
              language,
            },
            { stream: true },
          );

          for await (const chunk of stream) {
            $text += chunk.$text || '';
            controller.enqueue(chunk);
          }
          console.log('streamResult', $text);

          controller.enqueue({ delta: { status: { loading: true, message: 'Updating memory...' } } });
          // const msg = [
          //   { role: 'user', content: input.question },
          //   { role: 'assistant', content: $text },
          // ];
          // await Promise.all([ltm.add(msg, { userId }), stm.add(msg, { userId })]);
          // const allMemory = (
          //   await stm.filter({ k: 100, userId, sort: [{ field: 'createdAt', direction: 'asc' }] })
          // ).results
          //   .map((i) => i.memory)
          //   .join('\n');

          // controller.enqueue({ delta: { allMemory } });
          // controller.enqueue({ delta: { status: { loading: false } } });
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });
  },
});

export const agents = [
  questionAnalyzeAgent.definition,
  extractKeywordsAgent.definition,
  knowledgeAgent.definition,
  chat.definition,
  questionClassification.definition,
  docAgent.definition,
  chatAgent.definition,
  chatLLMAgent.definition,
  cleanMemoryAgent.definition,
  cleanMemoryLLMAgent.definition,
  cleanMemoryPipeline.definition,
  currentModelFunctionAgent.definition,
  currentModelLLMAgent.definition,
  currentModelPipelineAgent.definition,
  getAllModelsFunctionAgent.definition,
  findAllModelLLMAgent.definition,
  findAllModelPipelineAgent.definition,

  // checkModelClassification.definition,
  // checkModelPipelineAgent.definition,
  // extractModelClassification.definition,
  extractQuestionModelLLMAgent.definition,
  // needInputModelFunctionAgent.definition,
  // needSelectModelFunctionAgent.definition,
  switchModelFunctionAgent.definition,
  switchModelLLMAgent.definition,
  switchModelPipelineAgent.definition,
];
