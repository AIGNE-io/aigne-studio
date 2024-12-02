import { Project } from '../../types/project';

export const chatBot: Project = {
  id: 'chat-bot',
  name: 'Chat Bot',
  description: 'A simple chat bot project',
  createdAt: '2021-01-01T00:00:00Z',
  updatedAt: '2021-01-01T00:00:00Z',
  createdBy: 'xxxxxxxxxxxxxxxxxxxxxx',

  agents: {
    $indexes: ['CHAT_BOT_AGENT_ID'] as any,

    CHAT_BOT_AGENT_ID: {
      id: 'CHAT_BOT_AGENT_ID',
      name: 'Chat Bot',
      description: 'A simple chat bot',
      inputs: {
        $indexes: ['CHAT_BOT_INPUT_QUESTION_ID'] as any,
        CHAT_BOT_INPUT_QUESTION_ID: {
          id: 'CHAT_BOT_INPUT_QUESTION_ID',
          name: 'Question',
          type: 'string',
          placeholder: 'Ask me anything',
          required: true,
        },
      },

      processes: {
        $indexes: ['CHAT_BOT_PROCESS_LLM_ID'] as any,
        CHAT_BOT_PROCESS_LLM_ID: {
          id: 'CHAT_BOT_PROCESS_LLM_ID',
          name: 'LLM',
          type: 'llm',
          llm: {
            prompt: {
              $indexes: ['CHAT_BOT_PROMPT_MESSAGE_ID_1'] as any,
              CHAT_BOT_PROMPT_MESSAGE_ID_1: {
                id: 'CHAT_BOT_PROMPT_MESSAGE_ID_1',
                role: 'system',
                content: 'You are a professional chat bot.',
              },
              CHAT_BOT_PROMPT_MESSAGE_ID_2: {
                id: 'CHAT_BOT_PROMPT_MESSAGE_ID_2',
                role: 'user',
                content: '{{Question}}',
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
            variableId: 'CHAT_BOT_PROCESS_LLM_ID',
            path: ['$text'],
          },
        },
      },
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
                AGENT_ID_PROP_ID: { value: 'CHAT_BOT_AGENT_ID' },
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
                AGENT_ID_PROP_ID: { value: 'CHAT_BOT_AGENT_ID' },
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

            CHAT_BOT_OUTPUT_ANSWER_SECTION_ID: {
              id: 'CHAT_BOT_OUTPUT_ANSWER_SECTION_ID',
              name: 'Answer',
              renderer: {
                type: 'component',
                componentId: 'AIGNE_MARKDOWN_COMPONENT_ID',
                properties: {
                  CONTENT_PROP_ID: {
                    type: 'variable',
                    variableId: 'CHAT_BOT_OUTPUT_ANSWER_ID',
                  },
                },
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
