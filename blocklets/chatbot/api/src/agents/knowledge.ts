import { LLMAgent, LocalFunctionAgent } from '@aigne/core';
import { SessionUser } from '@blocklet/sdk/lib/util/login';
import { differenceBy } from 'lodash';

import { searchDiscussKit } from '../libs/discuss-kit';
import logger from '../libs/logger';
import { ChatbotResponse } from './type';

export const extractKeywordsAgent = LLMAgent.create<{ question: string; data: string }, { keywords: string[] }>({
  inputs: [
    {
      name: 'question',
      type: 'string',
      required: true,
    },
    {
      name: 'data',
      type: 'string',
      required: true,
    },
  ],
  outputs: [
    {
      name: 'keywords',
      type: 'array',
      description: 'Keywords used to search for related articles',
      items: { type: 'string' },
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
You are a professional SEO expert, proficient in optimizing search conditions for various search engines.
Please extract relevant search terms from the following articles based on the user's question to search for more content related to the articles below.

Articles to extract keywords:
-------- articles start --------
{{data}}
-------- articles end --------

You must extract keywords from the articles above based on the user's question:
{{question}}
`,
    },
  ],
});

export const knowledgeAgent = LocalFunctionAgent.create<
  { question: string },
  { list: { id: string; url: string; title: string; content?: string }[]; status: ChatbotResponse['status'] },
  { user: SessionUser }
>({
  name: 'knowledge',
  inputs: [
    {
      name: 'question',
      type: 'string',
      required: true,
    },
  ],
  outputs: [
    {
      name: 'list',
      type: 'array',
      required: true,
    },
  ],
  function: async ({ question }, { context }) => {
    return new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue({ delta: { status: { loading: true, message: 'Searching for relevant data...' } } });

          const { list } = await searchDiscussKit({
            q: question,
            type: 'all',
            limit: 8,
            sort: 'relevance',
            isHybrid: true,
            semanticRatio: 0.5,
            userDid: context.state.user.did,
            userRole: context.state.user.role!,
          });

          controller.enqueue({ delta: { list } });
          controller.enqueue({
            delta: {
              status: { loading: true, message: 'Attempting to extract key information from existing data...' },
            },
          });

          const { keywords } = await (
            await context.resolve<typeof extractKeywordsAgent>(extractKeywordsAgent.id)
          ).run({
            question,
            data: list.map((i) => `${i.title}\n${i.content}`).join('\n'),
          });

          logger.debug('Search knowledge by generated keywords:', keywords);

          controller.enqueue({
            delta: {
              status: { loading: true, message: 'Searching for more related data based on key information...' },
            },
          });
          const { list: relatedDocs } = await searchDiscussKit({
            q: keywords.join(' '),
            type: 'all',
            limit: 8,
            sort: 'relevance',
            isHybrid: true,
            semanticRatio: 0.5,
            userDid: context.state.user.did,
            userRole: context.state.user.role!,
          });

          const newDocs = differenceBy(relatedDocs, list, (i) => i.id);
          logger.debug('Related documents from generated keywords:', newDocs);

          const all = list.concat(newDocs);

          controller.enqueue({
            delta: {
              status: { loading: true, message: `Data query complete, found a total of ${all.length} related items` },
            },
          });

          controller.enqueue({ delta: { list: all } });
        } catch (error) {
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });
  },
});
