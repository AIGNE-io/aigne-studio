import { Project } from '../../types/project';

export const chatBot: Project = {
  id: 'block-chain-assistant',
  name: 'Block Chain Assistant',
  description: 'A simple block chain assistant project',
  createdAt: '2021-01-01T00:00:00Z',
  updatedAt: '2021-01-01T00:00:00Z',
  createdBy: 'xxxxxxxxxxxxxxxxxxxxxx',

  agents: {
    $indexes: ['BLOCK_CHAIN_AGENT_ID'] as any,

    BLOCK_CHAIN_AGENT_ID: {
      id: 'BLOCK_CHAIN_AGENT_ID',
      name: 'Block Chain Assistant',
      description: 'A simple block chain assistant',
      inputs: {
        $indexes: ['BLOCK_CHAIN_AGENT_INPUT_QUESTION_ID'] as any,

        BLOCK_CHAIN_AGENT_INPUT_QUESTION_ID: {
          id: 'BLOCK_CHAIN_AGENT_INPUT_QUESTION_ID',
          name: 'Question',
          type: 'string',
          placeholder: 'Ask me anything about ABT',
          required: true,
        },
      },

      processes: {
        $indexes: ['BLOCK_CHAIN_DECISION_ID'] as any,

        BLOCK_CHAIN_DECISION_ID: {
          id: 'BLOCK_CHAIN_DECISION_ID',
          name: 'Decision',
          type: 'decision',
          decision: {
            type: 'classifier',
            cases: {
              $indexes: ['PROCESS_QUERY_ABT_CHAIN_ID', 'PROCESS_TRANSFER_ABT_ID', 'PROCESS_OTHER_QUESTION_ID'] as any,

              // 查询 ABT 主链
              PROCESS_QUERY_ABT_CHAIN_ID: {
                id: 'PROCESS_QUERY_ABT_CHAIN_ID',
                name: 'Query ABT Blocklet Chain',

                processes: {
                  $indexes: ['QUERY_ABT_PROCESS_ID_0', 'QUERY_ABT_PROCESS_ID_1'] as any,

                  QUERY_ABT_PROCESS_ID_0: {
                    id: 'QUERY_ABT_PROCESS_ID_0',
                    type: 'call-agent',
                    name: 'Generate GQL Query',

                    callAgent: {
                      agent: {
                        id: 'BLOCK_CHAIN_GENERATE_GQL_AGENT_ID',
                      },

                      inputs: {
                        BLOCK_CHAIN_GENERATE_GQL_AGENT_INPUT_QUESTION_ID: {
                          from: 'variable',
                          variableId: 'BLOCK_CHAIN_AGENT_INPUT_QUESTION_ID',
                        },
                      },
                    },
                  },

                  QUERY_ABT_PROCESS_ID_1: {
                    id: 'QUERY_ABT_PROCESS_ID_1',
                    type: 'call-agent',
                    name: 'Query ABT Blocklet Chain',

                    callAgent: {
                      agent: {
                        id: 'BLOCK_CHAIN_GQL_AGENT_ID',
                      },

                      inputs: {
                        BLOCK_CHAIN_GQL_AGENT_INPUT_QUERY_ID: {
                          from: 'variable',
                          variableId: 'QUERY_ABT_PROCESS_ID_0',
                          path: ['BLOCK_CHAIN_GENERATE_GQL_OUTPUT_QUERY_ID'],
                        },
                      },
                    },
                  },
                },
              },

              // 转账
              PROCESS_TRANSFER_ABT_ID: {
                id: 'PROCESS_TRANSFER_ABT_ID',
                name: 'Transfer ABT to Another Account',

                processes: {
                  $indexes: ['BLOCKLET_API_TRANSFER_ABT_PROCESS_ID'] as any,

                  BLOCKLET_API_TRANSFER_ABT_PROCESS_ID: {
                    id: 'BLOCKLET_API_TRANSFER_ABT_PROCESS_ID',
                    name: 'Transfer ABT',
                    type: 'call-agent',
                    // 调用 Blocklet API 转账
                    callAgent: {
                      agent: {
                        id: 'BLOCKLET_API_TRANSFER_ABT_AGENT_ID',
                      },
                      inputs: {
                        BLOCKLET_API_TRANSFER_ABT_INPUT_TO_ID: {
                          from: 'llm',
                        },
                        BLOCKLET_API_TRANSFER_ABT_INPUT_AMOUNT_ID: {
                          from: 'llm',
                        },
                      },
                    },
                  },
                },
              },

              // 其他问题
              PROCESS_OTHER_QUESTION_ID: {
                id: 'PROCESS_OTHER_QUESTION_ID',
                name: 'Other Question',

                processes: {
                  $indexes: ['OTHER_QUESTION_PROCESS_ID_1'] as any,

                  OTHER_QUESTION_PROCESS_ID_1: {
                    id: 'OTHER_QUESTION_PROCESS_ID_1',
                    name: 'Chat bot about ABT',
                    type: 'call-agent',
                    callAgent: {
                      agent: {
                        id: 'BLOCK_CHAIN_CHAT_BOT_AGENT_ID',
                      },
                      inputs: {
                        BLOCK_CHAIN_CHAT_BOT_INPUT_QUESTION_ID: {
                          from: 'variable',
                          variableId: 'BLOCK_CHAIN_AGENT_INPUT_QUESTION_ID',
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

      outputs: {
        $indexes: ['CHAT_BOT_OUTPUT_ANSWER_ID'] as any,

        CHAT_BOT_OUTPUT_ANSWER_ID: {
          id: 'CHAT_BOT_OUTPUT_ANSWER_ID',
          name: 'Answer',
          value: {
            from: 'variable',
            variableId: 'BLOCK_CHAIN_DECISION_ID',
          },
        },
      },
    },

    // ABT Chain 聊天机器人
    BLOCK_CHAIN_CHAT_BOT_AGENT_ID: {
      id: 'BLOCK_CHAIN_CHAT_BOT_AGENT_ID',
      name: 'Block Chain Chat Bot',
      description: 'A simple chat bot for ABT Blocklet Chain',

      inputs: {
        $indexes: ['BLOCK_CHAIN_CHAT_BOT_INPUT_QUESTION_ID'] as any,

        BLOCK_CHAIN_CHAT_BOT_INPUT_QUESTION_ID: {
          id: 'BLOCK_CHAIN_CHAT_BOT_INPUT_QUESTION_ID',
          name: 'Question',
          type: 'string',
          placeholder: 'Ask me anything about ABT',
          required: true,
        },
      },

      knowledge: {
        $indexes: ['BLOCK_CHAIN_CHAT_BOT_KNOWLEDGE_ID_1'] as any,

        BLOCK_CHAIN_CHAT_BOT_KNOWLEDGE_ID_1: {
          id: 'BLOCK_CHAIN_CHAT_BOT_KNOWLEDGE_ID_1',
          knowledge: {
            id: 'ABT_CHAIN_KNOWLEDGE_ID',
          },
        },
      },

      processes: {
        $indexes: ['BLOCK_CHAIN_CHAT_BOT_PROCESS_ID'] as any,

        BLOCK_CHAIN_CHAT_BOT_PROCESS_ID: {
          id: 'BLOCK_CHAIN_CHAT_BOT_PROCESS_ID',
          name: 'Answer',
          type: 'llm',
          llm: {
            prompt: {
              $indexes: ['BLOCK_CHAIN_CHAT_BOT_PROMPT_MESSAGE_ID_1'] as any,

              BLOCK_CHAIN_CHAT_BOT_PROMPT_MESSAGE_ID_1: {
                id: 'BLOCK_CHAIN_CHAT_BOT_PROMPT_MESSAGE_ID_1',
                role: 'system',
                content: 'You are a professional chat bot. you can answer any question about ABT.',
              },

              BLOCK_CHAIN_CHAT_BOT_PROMPT_MESSAGE_ID_2: {
                id: 'BLOCK_CHAIN_CHAT_BOT_PROMPT_MESSAGE_ID_2',
                role: 'user',
                content: '{{Question}}',
              },
            },
          },
        },
      },

      outputs: {
        $indexes: ['BLOCK_CHAIN_CHAT_BOT_OUTPUT_ANSWER_ID'] as any,

        BLOCK_CHAIN_CHAT_BOT_OUTPUT_ANSWER_ID: {
          id: 'BLOCK_CHAIN_CHAT_BOT_OUTPUT_ANSWER_ID',
          name: 'Answer',
          value: {
            from: 'variable',
            variableId: 'BLOCK_CHAIN_CHAT_BOT_PROCESS_ID',
            path: ['$text'],
          },
        },
      },
    },

    // 生成 ABT 主链的 GraphQL 查询
    BLOCK_CHAIN_GENERATE_GQL_AGENT_ID: {
      id: 'BLOCK_CHAIN_GENERATE_GQL_AGENT_ID',
      name: 'Generate GQL Agent',
      description: 'A simple agent for ABT Blocklet Chain',

      inputs: {
        $indexes: ['BLOCK_CHAIN_GENERATE_GQL_AGENT_INPUT_QUESTION_ID'] as any,

        BLOCK_CHAIN_GENERATE_GQL_AGENT_INPUT_QUESTION_ID: {
          id: 'BLOCK_CHAIN_GENERATE_GQL_AGENT_INPUT_QUESTION_ID',
          name: 'Question',
          type: 'string',
          placeholder: 'Query to ABT Blocklet Chain',
          required: true,
        },
      },

      processes: {
        $indexes: ['BLOCK_CHAIN_GENERATE_GQL_PROCESS_ID'] as any,

        BLOCK_CHAIN_GENERATE_GQL_PROCESS_ID: {
          id: 'BLOCK_CHAIN_GENERATE_GQL_PROCESS_ID',
          name: 'Generate GQL',
          type: 'llm',
          llm: {
            prompt:
              "You are a professional chat bot. you can generate any query for ABT Blocklet Chain for user's question {{Question}}",

            outputs: {
              fields: {
                $indexes: ['BLOCK_CHAIN_GENERATE_GQL_PROCESS_OUTPUT_QUERY_ID'] as any,

                BLOCK_CHAIN_GENERATE_GQL_PROCESS_OUTPUT_QUERY_ID: {
                  id: 'BLOCK_CHAIN_GENERATE_GQL_PROCESS_OUTPUT_QUERY_ID',
                  name: 'Query',
                  description: 'Query to ABT Blocklet Chain',
                  type: 'string',
                  required: true,
                },
              },
            },
          },
        },
      },

      outputs: {
        $indexes: ['BLOCK_CHAIN_GENERATE_GQL_OUTPUT_QUERY_ID'] as any,

        BLOCK_CHAIN_GENERATE_GQL_OUTPUT_QUERY_ID: {
          id: 'BLOCK_CHAIN_GENERATE_GQL_OUTPUT_QUERY_ID',
          name: 'Query',
          description: 'Query to ABT Blocklet Chain',

          value: {
            from: 'variable',
            variableId: 'BLOCK_CHAIN_GENERATE_GQL_PROCESS_ID',
            path: ['BLOCK_CHAIN_GENERATE_GQL_PROCESS_OUTPUT_QUERY_ID'],
          },
        },
      },
    },

    // 获取 ABT 主链的 GraphQL Schema
    BLOCK_CHAIN_SCHEMA_AGENT_ID: {
      id: 'BLOCK_CHAIN_SCHEMA_AGENT_ID',
      name: 'Block Chain Schema Agent',
      description: 'A simple agent for ABT Blocklet Chain Schema',

      processes: {
        $indexes: ['BLOCK_CHAIN_SCHEMA_PROCESS_ID'] as any,

        BLOCK_CHAIN_SCHEMA_PROCESS_ID: {
          id: 'BLOCK_CHAIN_SCHEMA_PROCESS_ID',
          name: 'Schema',
          type: 'call-agent',
          callAgent: {
            agent: {
              id: 'BLOCK_CHAIN_GQL_AGENT_ID',
            },
            inputs: {
              BLOCK_CHAIN_GQL_AGENT_INPUT_QUERY_ID: {
                value: 'query { IntrospectionQuery { ... } }',
              },
            },
          },
        },
      },

      outputs: {
        $indexes: ['BLOCK_CHAIN_SCHEMA_OUTPUT_DATA_ID'] as any,

        BLOCK_CHAIN_SCHEMA_OUTPUT_DATA_ID: {
          id: 'BLOCK_CHAIN_SCHEMA_OUTPUT_DATA_ID',
          name: 'Data',
          value: {
            from: 'variable',
            variableId: 'BLOCK_CHAIN_SCHEMA_PROCESS_ID',
            path: ['BLOCK_CHAIN_GQL_OUTPUT_DATA_ID'],
          },
        },
      },
    },

    // 调用 ABT 主链的 GraphQL 查询接口
    BLOCK_CHAIN_GQL_AGENT_ID: {
      id: 'BLOCK_CHAIN_GQL_AGENT_ID',
      name: 'Blocklet Chain GQL Agent',
      description: 'Query information ABT Blocklet Chain',

      inputs: {
        $indexes: ['BLOCK_CHAIN_GQL_AGENT_INPUT_QUERY_ID'] as any,

        BLOCK_CHAIN_GQL_AGENT_INPUT_QUERY_ID: {
          id: 'BLOCK_CHAIN_GQL_AGENT_INPUT_QUERY_ID',
          name: 'query',
          type: 'string',
          placeholder: 'GraphQL Query to ABT Blocklet Chain',
          required: true,
        },
      },

      processes: {
        $indexes: ['BLOCK_CHAIN_GQL_PROCESS_ID'] as any,

        BLOCK_CHAIN_GQL_PROCESS_ID: {
          id: 'BLOCK_CHAIN_GQL_PROCESS_ID',
          name: 'GQL',
          type: 'logic',
          logic: {
            outputs: {
              fields: {
                $indexes: ['BLOCK_CHAIN_GQL_PROCESS_OUTPUT_ID'] as any,

                BLOCK_CHAIN_GQL_PROCESS_OUTPUT_ID: {
                  id: 'BLOCK_CHAIN_GQL_PROCESS_OUTPUT_ID',
                  name: 'Data',
                  description: 'Data from ABT Blocklet Chain',
                  type: 'object',
                  required: true,
                },
              },
            },
          },
        },
      },

      outputs: {
        $indexes: ['BLOCK_CHAIN_GQL_OUTPUT_DATA_ID'] as any,

        BLOCK_CHAIN_GQL_OUTPUT_DATA_ID: {
          id: 'BLOCK_CHAIN_GQL_OUTPUT_DATA_ID',
          name: 'Data',
          description: 'Data from ABT Blocklet Chain',

          value: {
            from: 'variable',
            variableId: 'BLOCK_CHAIN_GQL_PROCESS_OUTPUT_ID',
          },
        },
      },
    },
  },

  knowledge: {
    $indexes: ['ABT_CHAIN_KNOWLEDGE_ID'] as any,

    ABT_CHAIN_KNOWLEDGE_ID: {
      id: 'ABT_CHAIN_KNOWLEDGE_ID',
      name: 'ABT Chain',
      description: 'Knowledge about ABT Chain',
    },
  },

  appearance: {
    pages: {
      $indexes: ['CHAT_BOT_PAGE_HOME_ID', 'CHAT_BOT_PAGE_CHAT_ID'] as any,

      CHAT_BOT_PAGE_HOME_ID: {
        id: 'CHAT_BOT_PAGE_HOME_ID',
        name: 'Home',
        path: '/',
        sections: {
          $indexes: ['CHAT_BOT_PAGE_HOME_SECTION_ID_1'] as any,

          CHAT_BOT_PAGE_HOME_SECTION_ID_1: {
            id: 'CHAT_BOT_PAGE_HOME_SECTION_ID_1',
            name: 'Header',
            renderer: {
              type: 'component',
              componentId: 'HERO_COMPONENT_ID',
              properties: {
                TITLE_PROP_ID: { value: 'Chat Bot' },
                DESCRIPTION_PROP_ID: { value: 'A simple chat bot' },
                ACTIONS_PROP_ID: {
                  value: [
                    {
                      type: 'button',
                      label: 'Start Chat',
                      navigation: {
                        type: 'page',
                        pageId: 'CHAT_BOT_PAGE_CHAT_ID',
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },

      CHAT_BOT_PAGE_CHAT_ID: {
        id: 'CHAT_BOT_PAGE_CHAT_ID',
        name: 'Chat',
        path: '/chat',
        sections: {
          $indexes: [
            'CHAT_BOT_PAGE_CHAT_SECTION_ID_1',
            'CHAT_BOT_PAGE_CHAT_SECTION_ID_2',
            'CHAT_BOT_PAGE_CHAT_SECTION_ID_3',
            'CHAT_BOT_PAGE_CHAT_SECTION_ID_4',
          ] as any,

          CHAT_BOT_PAGE_CHAT_SECTION_ID_1: {
            id: 'CHAT_BOT_PAGE_CHAT_SECTION_ID_1',
            name: 'Header',
            renderer: {
              type: 'component',
              componentId: 'HERO_COMPONENT_ID',
              properties: {
                TITLE_PROP_ID: { value: 'Chat Bot' },
                DESCRIPTION_PROP_ID: { value: 'Ask me anything' },
              },
            },
          },

          CHAT_BOT_PAGE_CHAT_SECTION_ID_2: {
            id: 'CHAT_BOT_PAGE_CHAT_SECTION_ID_2',
            name: 'Output',
            renderer: {
              type: 'component',
              componentId: 'AIGNE_DEFAULT_MESSAGES_COMPONENT_ID',
              properties: {
                AGENT_ID_PROP_ID: { value: 'BLOCK_CHAIN_AGENT_ID' },
                VARIABLE_PROP_ID: { value: 'chat' },
                OUTPUT_COMPONENT_PROP_ID: { value: 'CHAT_BOT_OUTPUT_COMPONENT_ID' },
              },
            },
          },

          CHAT_BOT_PAGE_CHAT_SECTION_ID_3: {
            id: 'CHAT_BOT_PAGE_CHAT_SECTION_ID_3',
            name: 'Input',
            renderer: {
              type: 'component',
              componentId: 'AIGNE_DEFAULT_INPUT_COMPONENT_ID',
              properties: {
                AGENT_ID_PROP_ID: { value: 'BLOCK_CHAIN_AGENT_ID' },
                CHAT_MODE_PROP_ID: { value: true },
                SUBMIT_TITLE_PROP_ID: { value: 'Send' },
              },
            },
          },

          CHAT_BOT_PAGE_CHAT_SECTION_ID_4: {
            id: 'CHAT_BOT_PAGE_CHAT_SECTION_ID_4',
            name: 'Footer',
            renderer: {
              type: 'component',
              componentId: 'FOOTER_COMPONENT_ID',
              properties: {
                CONTENT_PROP_ID: { value: '© 2021 Chat Bot. All rights reserved.' },
              },
            },
          },
        },
      },
    },

    components: {
      $indexes: ['CHAT_BOT_OUTPUT_COMPONENT_ID'] as any,

      CHAT_BOT_OUTPUT_COMPONENT_ID: {
        id: 'CHAT_BOT_OUTPUT_COMPONENT_ID',
        name: 'Chat Bot Output',
        renderer: {
          type: 'sections',
          sections: {
            $indexes: ['CHAT_BOT_OUTPUT_ANSWER_SECTION_ID', 'CHAT_BOT_OUTPUT_SHARE_SECTION_ID'] as any,

            CHAT_BOT_OUTPUT_SECTION_ID: {
              id: 'CHAT_BOT_OUTPUT_SECTION_ID',
              name: 'Output',
              renderer: {
                type: 'component',
                componentId: 'AIGNE_OUTPUT_COMPONENT_ID',
              },
            },

            CHAT_BOT_OUTPUT_SHARE_SECTION_ID: {
              id: 'CHAT_BOT_OUTPUT_SHARE_SECTION_ID',
              name: 'Share',
              renderer: {
                type: 'component',
                componentId: 'AIGNE_SHARE_COMPONENT_ID',
                properties: {
                  TEXT_PROP_ID: {
                    type: 'variable',
                    variableId: 'CHAT_BOT_OUTPUT_ANSWER_ID',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
