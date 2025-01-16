import { expect, test } from 'bun:test';

import { LocalFunctionAgent, SchemaType } from '../../src';
import { MockContext } from '../mocks/context';

test('LocalFunctionAgent.run', async () => {
  const userSchema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        required: true,
      },
      age: {
        type: 'number',
      },
      tags: {
        type: 'array',
        items: {
          type: 'string',
        },
      },
      favoriteFoods: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              required: true,
            },
            calories: {
              type: 'number',
            },
          },
        },
      },
    },
  } as const;

  const user: SchemaType<typeof userSchema> = {
    name: 'Alice',
    age: 25,
    tags: ['tag1', 'tag2'],
    favoriteFoods: [
      { name: 'apple', calories: 100 },
      { name: 'banana', calories: 150 },
    ],
  };

  const agent = LocalFunctionAgent.create({
    context: new MockContext(),
    inputs: {
      question: {
        type: 'string',
        required: true,
      },
      user: userSchema,
    },
    outputs: {
      $text: {
        type: 'string',
        required: true,
      },
      user: userSchema,
    },
    function: async ({ question, user }) => {
      return { $text: `ECHO: ${question}`, user };
    },
  });

  const result = await agent.run({ question: 'hello', user });
  expect(result).toEqual({ $text: 'ECHO: hello', user });
});
