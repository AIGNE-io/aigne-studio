import { expect, spyOn, test } from 'bun:test';
import { nanoid } from 'nanoid';

import { LocalFunctionAgent } from '../../src';
import { MockContext } from '../mocks/context';
import { MockMemory } from '../mocks/memory';

test('LocalFunctionAgent.run with memory', async () => {
  const history = new MockMemory();

  const search = spyOn(history, 'search').mockImplementation(async () => {
    return { results: [] };
  });

  const agent = LocalFunctionAgent.create({
    context: new MockContext(),
    inputs: {
      question: {
        type: 'string',
        required: true,
      },
    },
    outputs: {
      $text: {
        type: 'string',
        required: true,
      },
    },
    memories: {
      history: {
        memory: history,
      },
    },
    function: async ({ question }) => {
      return { $text: `ECHO: ${question}` };
    },
  });

  const result = await agent.run({ question: 'hello' });
  expect(result).toEqual({ $text: 'ECHO: hello' });

  expect(search).toHaveBeenCalledWith('question hello', expect.objectContaining({}));
});

test('LocalFunctionAgent.run with custom memory options', async () => {
  const userId = nanoid();

  const history = new MockMemory();

  const search = spyOn(history, 'search').mockImplementation(async () => {
    return { results: [] };
  });

  const agent = LocalFunctionAgent.create({
    context: new MockContext({ state: { userId } }),
    inputs: {
      question: {
        type: 'string',
        required: true,
      },
    },
    outputs: {
      $text: {
        type: 'string',
        required: true,
      },
    },
    memories: {
      history: {
        memory: history,
        query: {
          fromVariable: 'question',
        },
        options: {
          k: 20,
        },
      },
    },
    function: async ({ question }) => {
      return { $text: `ECHO: ${question}` };
    },
  });

  const result = await agent.run({ question: 'hello' });
  expect(result).toEqual({ $text: 'ECHO: hello' });

  expect(search).toHaveBeenCalledWith('hello', expect.objectContaining({ k: 20, userId }));
});
