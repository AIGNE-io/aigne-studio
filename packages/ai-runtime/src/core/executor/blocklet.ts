import { Base64 } from 'js-base64';

import { AIGNE_RUNTIME_COMPONENT_DID } from '../../constants';

export const HISTORY_DID = Base64.encodeURI(['/api/messages', 'get'].join('/'));
export const KNOWLEDGE_DID = Base64.encodeURI(['/api/datasets/{datasetId}/search', 'get'].join('/'));
export const MEMORIED_DID = Base64.encodeURI(['/api/memories/variable-by-query', 'get'].join('/'));

// 内置的 OpenAPI 接口
export const buildInOpenAPI = {
  '/ai-studio/api/messages': {
    get: {
      summary: 'Get history messages',
      'x-summary-zh': '获取历史信息',
      description: 'Retrieve messages based on sessionId, last N messages, or keyword',
      'x-description-zh': '根据 sessionId、最后N条消息或关键字检索历史消息',
      tags: ['AIGNE Studio'],
      parameters: [
        {
          in: 'query',
          name: 'sessionId',
          schema: {
            type: 'string',
          },
          description: 'Session Id',
        },
        {
          in: 'query',
          name: 'userId',
          schema: {
            type: 'string',
          },
          description: 'User Id',
        },
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
                        role: {
                          type: 'string',
                        },
                        content: {
                          type: 'string',
                        },
                        agentId: {
                          type: 'string',
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
      'x-id': HISTORY_DID,
      'x-did': AIGNE_RUNTIME_COMPONENT_DID,
      'x-path': '/api/messages',
      'x-method': 'get',
    },
  },
  '/ai-runtime/api/datasets/{datasetId}/search': {
    get: {
      summary: 'Search the knowledge',
      'x-summary-zh': '搜索知识库信息',
      parameters: [
        {
          name: 'datasetId',
          in: 'path',
          required: true,
          schema: {
            type: 'string',
          },
          description: 'The ID of the dataset to search',
        },
        {
          name: 'blockletDid',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
          description: 'The Blocklet DID to search for',
        },
        {
          name: 'searchAll',
          in: 'query',
          required: false,
          schema: {
            type: 'boolean',
          },
          description: 'Whether to search all contents',
        },
        {
          name: 'message',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
          description: 'The search message',
        },
        {
          name: 'n',
          in: 'query',
          required: false,
          schema: {
            type: 'integer',
            default: 10,
          },
          description: 'The number of results to return',
        },
      ],
      responses: {
        '200': {
          description: 'A list of search results',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  docs: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: {
                          type: 'string',
                          description: 'The title of the document',
                        },
                        content: {
                          type: 'string',
                          description: 'The content of the document',
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
      'x-id': KNOWLEDGE_DID,
      'x-did': AIGNE_RUNTIME_COMPONENT_DID,
      'x-path': '/api/datasets/{datasetId}/search',
      'x-method': 'get',
    },
  },
  '/ai-runtime/api/memories/variable-by-query': {
    get: {
      summary: 'Get memory variables by query',
      'x-summary-zh': '知识库信息',
      parameters: [
        {
          name: 'key',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
          description: 'The key of the variable',
        },
        {
          name: 'projectId',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
          description: 'The ID of the project',
        },
        {
          name: 'scope',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
            enum: ['session', 'user', 'global'],
          },
          description: 'The scope of the variable',
        },
        {
          name: 'sessionId',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
          description: 'The ID of the session',
        },
        {
          name: 'userId',
          in: 'query',
          required: false,
          schema: {
            type: 'string',
          },
          description: 'The ID of the user',
        },
      ],
      responses: {
        '200': {
          description: 'A list of memory variables',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  datastores: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          description: 'The ID of the memory entry',
                        },
                        key: {
                          type: 'string',
                          description: 'The key of the memory entry',
                        },
                        data: {
                          type: 'string',
                          description: 'The value of the memory entry',
                        },
                        userId: {
                          type: 'string',
                          description: 'The ID of the user',
                        },
                        projectId: {
                          type: 'string',
                          description: 'The ID of the project',
                        },
                        sessionId: {
                          type: 'string',
                          description: 'The ID of the session',
                        },
                        scope: {
                          type: 'string',
                          description: 'The scope of the memory entry',
                          enum: ['session', 'user', 'global'],
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
      'x-id': MEMORIED_DID,
      'x-did': AIGNE_RUNTIME_COMPONENT_DID,
      'x-path': '/api/memories/variable-by-query',
      'x-method': 'get',
    },
  },
};
