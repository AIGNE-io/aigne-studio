import { expect, spyOn, test } from 'bun:test';

import { APIAgent } from '../../src';

test('run with mocked get request', async () => {
  const agent = APIAgent.create({
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

  spyOn(agent, 'fetch').mockImplementation((request) => request);

  const result = await agent.run({
    id: '123',
    message: 'hello',
    message1: 'hello world2',
    message2: 'hello world3',
  });

  expect(result.url).toEqual('https://api.example.com/test/123');
  expect(result.method).toEqual('GET');
  expect(result.query).toEqual({ message: 'hello' });
  expect(result.headers).toEqual({ message2: 'hello world3' });
  expect(result.cookies).toEqual({ message1: 'hello world2' });
  expect(result.body).toBeUndefined();
});

test('run with mocked post request', async () => {
  const agent = APIAgent.create({
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
      message3: {
        type: 'string',
        required: true,
        in: 'body',
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
      method: 'post',
    },
  });

  spyOn(agent, 'fetch').mockImplementation((request) => request);

  const result = await agent.run({
    id: '123',
    message: 'hello',
    message1: 'hello world2',
    message2: 'hello world3',
    message3: 'hello world4',
  });

  expect(result.url).toEqual('https://api.example.com/test/123');
  expect(result.method).toEqual('POST');
  expect(result.query).toEqual({ message: 'hello' });
  expect(result.headers).toEqual({ message2: 'hello world3' });
  expect(result.cookies).toEqual({ message1: 'hello world2' });
  expect(result.body).toEqual({ message3: 'hello world4' });
});

test('run with mocked default parameters', async () => {
  const agent = APIAgent.create({
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
      },
      message2: {
        type: 'string',
        required: true,
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

  spyOn(agent, 'fetch').mockImplementation((request) => request);

  const result = await agent.run({
    id: '123',
    message: 'hello',
    message1: 'hello world2',
    message2: 'hello world3',
  });

  expect(result.url).toEqual('https://api.example.com/test/123');
  expect(result.method).toEqual('GET');
  expect(result.query).toEqual({ message: 'hello', message1: 'hello world2', message2: 'hello world3' });
  expect(result.body).toBeUndefined();
});

test('run with mocked basic auth config', async () => {
  const agent = APIAgent.create({
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
        in: 'header',
      },
      message2: {
        type: 'string',
        required: true,
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
      auth: {
        type: 'basic',
        token: '123456',
        key: 'Auth',
      },
    },
  });

  spyOn(agent, 'fetch').mockImplementation((request) => request);

  const result = await agent.run({
    id: '123',
    message: 'hello',
    message1: 'hello world2',
    message2: 'hello world3',
  });

  expect(result.headers).toEqual({ Auth: 'Basic 123456', message1: 'hello world2' });
});

test('run with mocked bearer auth config', async () => {
  const agent = APIAgent.create({
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
        in: 'header',
      },
      message2: {
        type: 'string',
        required: true,
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
      auth: {
        type: 'bearer',
        token: '123456',
      },
    },
  });

  spyOn(agent, 'fetch').mockImplementation((request) => request);

  const result = await agent.run({
    id: '123',
    message: 'hello',
    message1: 'hello world2',
    message2: 'hello world3',
  });

  expect(result.headers).toEqual({ Authorization: 'Bearer 123456', message1: 'hello world2' });
});
