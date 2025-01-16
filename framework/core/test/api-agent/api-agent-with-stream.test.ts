import { expect, spyOn, test } from 'bun:test';

import { OpenAPIAgent } from '../../src';

test('run with mocked get request', async () => {
  const agent = OpenAPIAgent.create({
    inputs: {
      id: {
        type: 'string',
        required: true,
        in: 'path',
      },
      message: {
        type: 'string',
        required: true,
        in: 'query',
      },
      message1: {
        type: 'string',
        required: true,
        in: 'cookie',
      },
      message2: {
        type: 'string',
        required: true,
        in: 'header',
      },
    },
    outputs: {
      url: {
        type: 'string',
        required: true,
      },
      method: {
        type: 'string',
        required: true,
      },
      query: {
        type: 'object',
        required: true,
      },
      headers: {
        type: 'object',
        required: true,
      },
      cookies: {
        type: 'object',
        required: true,
      },
      body: {
        type: 'object',
        required: true,
      },
    },
    api: {
      url: 'https://api.example.com/test/{id}',
      method: 'get',
    },
  });

  spyOn(agent, 'fetch').mockImplementation((request) => Promise.resolve(request));

  const result = await agent.run(
    {
      id: '123',
      message: 'hello',
      message1: 'hello world2',
      message2: 'hello world3',
    },
    { stream: true }
  );

  const reader = result.getReader();

  expect(await reader.read()).toEqual({
    value: {
      $text: undefined,
      delta: {
        url: 'https://api.example.com/test/123',
        method: 'GET',
        headers: {
          message2: 'hello world3',
        },
        query: {
          message: 'hello',
        },
        cookies: {
          message1: 'hello world2',
        },
      },
    },
    done: false,
  });
  expect(await reader.read()).toEqual({ value: undefined, done: true });
});
