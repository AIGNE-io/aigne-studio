import { expect, mock, spyOn, test } from 'bun:test';

import { BlockletAgent } from '../../src/provider/blocklet-agent';

mock.module('@blocklet/sdk/lib/config', () => ({
  default: {
    env: {
      appUrl: 'https://api.example.com',
    },
  },
}));

mock.module('@blocklet/sdk/lib/component', () => ({
  getComponentMountPoint: () => '/ai-runtime',
}));

test('run with mocked get request', async () => {
  const agent = BlockletAgent.create({
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
    openapiId: 'z8iZukRQuk7tLqhRq35mDfkivG1XGj3AVfmNN',
  });

  spyOn(agent, 'getBlockletAgent').mockImplementation(() => {
    return {
      agentsMap: {
        z8iZukRQuk7tLqhRq35mDfkivG1XGj3AVfmNN: {
          type: 'blocklet',
          id: 'z8iZukRQuk7tLqhRq35mDfkivG1XGj3AVfmNN',
          name: 'test',
          description: 'test',
          openApi: {
            summary: 'Get History Messages',
            'x-summary-zh': '获取历史信息',
            description: 'Retrieve messages based on sessionId, last N messages, or keyword',
            'x-description-zh': '根据 sessionId、最后N条消息或关键字检索历史消息',
            tags: ['AIGNE Runtime'],
            parameters: [
              {
                in: 'query',
                name: 'limit',
                schema: {
                  type: 'integer',
                },
                description: 'Number of last messages to retrieve',
                'x-description-zh': '检索的消息的数目',
              },
              {
                in: 'query',
                name: 'keyword',
                schema: {
                  type: 'string',
                },
                description: 'Keyword to search in messages',
                'x-description-zh': '在消息中搜索的关键字',
              },
            ],
            responses: {
              '200': {
                description: 'A list of history messages',
                'x-description-zh': '检索历史消息列表',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        messages: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: {
                                type: 'string',
                              },
                              taskId: {
                                type: 'string',
                              },
                              createdAt: {
                                type: 'string',
                                format: 'date-time',
                              },
                              updatedAt: {
                                type: 'string',
                                format: 'date-time',
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            path: '/api/messages',
            id: 'z8iZukRQuk7tLqhRq35mDfkivG1XGj3AVfmNN',
            did: 'z2qaBP9SahqU2L2YA3ip7NecwKACMByTFuiJ2',
            method: 'get',
            'x-id': 'z8iZukRQuk7tLqhRq35mDfkivG1XGj3AVfmNN',
            'x-did': 'z2qaBP9SahqU2L2YA3ip7NecwKACMByTFuiJ2',
            'x-path': '/api/messages',
            'x-method': 'get',
          },
        },
      },
    } as any;
  });
  spyOn(agent, 'fetch').mockImplementation((request) => Promise.resolve(request));

  const result = await agent.run({
    id: '123',
    message: 'hello',
    message1: 'hello world2',
    message2: 'hello world3',
  });

  expect(result.url).toEqual('https://api.example.com/ai-runtime/api/messages');
  expect(result.method).toEqual('GET');
  expect(result.query).toEqual({ message: 'hello' });
  expect(result.headers).toEqual({ message2: 'hello world3' });
  expect(result.cookies).toEqual({ message1: 'hello world2' });
  expect(result.body).toBeUndefined();
});

test('run with mocked basic auth config', async () => {
  const agent = BlockletAgent.create({
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
    openapiId: 'z8iZukRQuk7tLqhRq35mDfkivG1XGj3AVfmNN',
    auth: {
      type: 'basic',
      token: '123456',
      key: 'Auth',
    },
  });

  spyOn(agent, 'getBlockletAgent').mockImplementation(() => {
    return {
      agentsMap: {
        z8iZukRQuk7tLqhRq35mDfkivG1XGj3AVfmNN: {
          type: 'blocklet',
          id: 'z8iZukRQuk7tLqhRq35mDfkivG1XGj3AVfmNN',
          name: 'test',
          description: 'test',
          openApi: {
            summary: 'Get History Messages',
            'x-summary-zh': '获取历史信息',
            description: 'Retrieve messages based on sessionId, last N messages, or keyword',
            'x-description-zh': '根据 sessionId、最后N条消息或关键字检索历史消息',
            tags: ['AIGNE Runtime'],
            parameters: [
              {
                in: 'query',
                name: 'limit',
                schema: {
                  type: 'integer',
                },
                description: 'Number of last messages to retrieve',
                'x-description-zh': '检索的消息的数目',
              },
              {
                in: 'query',
                name: 'keyword',
                schema: {
                  type: 'string',
                },
                description: 'Keyword to search in messages',
                'x-description-zh': '在消息中搜索的关键字',
              },
            ],
            responses: {
              '200': {
                description: 'A list of history messages',
                'x-description-zh': '检索历史消息列表',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        messages: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: {
                                type: 'string',
                              },
                              taskId: {
                                type: 'string',
                              },
                              createdAt: {
                                type: 'string',
                                format: 'date-time',
                              },
                              updatedAt: {
                                type: 'string',
                                format: 'date-time',
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            path: '/api/messages',
            id: 'z8iZukRQuk7tLqhRq35mDfkivG1XGj3AVfmNN',
            did: 'z2qaBP9SahqU2L2YA3ip7NecwKACMByTFuiJ2',
            method: 'get',
            'x-id': 'z8iZukRQuk7tLqhRq35mDfkivG1XGj3AVfmNN',
            'x-did': 'z2qaBP9SahqU2L2YA3ip7NecwKACMByTFuiJ2',
            'x-path': '/api/messages',
            'x-method': 'get',
          },
        },
      },
    } as any;
  });
  spyOn(agent, 'fetch').mockImplementation((request) => Promise.resolve(request));

  const result = await agent.run({
    id: '123',
    message: 'hello',
    message1: 'hello world2',
    message2: 'hello world3',
  });

  expect(result.url).toEqual('https://api.example.com/ai-runtime/api/messages');
  expect(result.method).toEqual('GET');
  expect(result.query).toEqual({ message: 'hello', message2: 'hello world3' });
  expect(result.headers).toEqual({ Auth: 'Basic 123456', message1: 'hello world2' });
});
