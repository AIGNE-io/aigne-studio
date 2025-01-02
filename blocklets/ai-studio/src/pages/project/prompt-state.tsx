import type { ExecuteBlockYjs, PromptAssistantYjs, PromptYjs, Tool } from '@blocklet/ai-runtime/types';
import { isPromptAssistant, nextAssistantId } from '@blocklet/ai-runtime/types';
import type { Map } from '@blocklet/co-git/yjs';
import { getYjsValue } from '@blocklet/co-git/yjs';
import { cloneDeep } from 'lodash';
import sortBy from 'lodash/sortBy';
import { useCallback, useEffect } from 'react';

import { useProjectStore } from './yjs-state';

export function usePromptsState({
  projectId,
  gitRef,
  templateId,
}: {
  projectId: string;
  gitRef: string;
  templateId: string;
}) {
  const { store } = useProjectStore(projectId, gitRef);

  const file = store.files[templateId];
  const template = file && isPromptAssistant(file) ? file : undefined;

  const addPrompt = useCallback(
    (prompt: NonNullable<PromptAssistantYjs['prompts']>[string]['data'], index?: number) => {
      if (!template) return;

      const doc = (getYjsValue(template) as Map<any>).doc!;
      doc.transact(() => {
        template.prompts ??= {};

        template.prompts[prompt.data.id] = {
          index: typeof index === 'number' ? index - 0.1 : Object.keys(template.prompts).length,
          data: prompt,
        };

        sortBy(Object.values(template.prompts), (i) => i.index).forEach((i, index) => (i.index = index));
      });
    },
    [template]
  );

  const copePrompt = useCallback(
    (prompt: PromptYjs, index: number) => {
      if (!template) return;

      const doc = (getYjsValue(template) as Map<any>).doc!;
      doc.transact(() => {
        template.prompts ??= {};

        if (!template.prompts[prompt.data.id]) return;
        try {
          const copyPrompt = cloneDeep(prompt);
          copyPrompt.data.id = nextAssistantId();

          template.prompts[copyPrompt.data.id] = {
            index: typeof index === 'number' ? index + 0.1 : Object.keys(template.prompts).length,
            data: copyPrompt,
          };

          sortBy(Object.values(template.prompts), (i) => i.index).forEach((i, index) => (i.index = index));
        } catch (error) {
          console.error(error?.message);
        }
      });
    },
    [template]
  );

  const deletePrompt = useCallback(
    ({ promptId }: { promptId: string }) => {
      if (!template?.prompts) return;

      const doc = (getYjsValue(template) as Map<any>).doc!;
      doc.transact(() => {
        delete template.prompts![promptId];
        sortBy(Object.values(template.prompts!), (i) => i.index).forEach((i, index) => (i.index = index));
      });
    },
    [template]
  );

  const addDatasetPrompt = useCallback(() => {
    if (!template) return;

    const doc = (getYjsValue(template) as Map<any>).doc!;
    doc.transact(() => {
      template.prompts ??= {};
      const exit = Object.values(template.prompts).find((x) => (x?.data?.data as ExecuteBlockYjs)?.type === 'dataset');
      if (exit) return;

      const tool: Tool = {
        id: 'AI-Studio:/api/datasets/{knowledgeId}/search:get',
        from: 'blockletAPI',
        parameters: {
          knowledgeId: '{{knowledgeId}}',
          message: '',
        },
      };

      const prompt: PromptYjs = {
        type: 'executeBlock',
        data: {
          id: nextAssistantId(),
          selectType: 'all',
          role: 'system',
          type: 'dataset',
          prefix: 'Please use the following as context:',
          tools: {
            [tool.id]: {
              index: 0,
              data: tool,
            },
          },
        },
      };

      template.prompts[prompt.data.id] = {
        index: -1,
        data: prompt,
      };

      sortBy(Object.values(template.prompts), (i) => i.index).forEach((i, index) => (i.index = index));
    });
  }, [template]);

  const deleteDatasetPrompt = useCallback(() => {
    if (!template?.prompts) return;

    const doc = (getYjsValue(template) as Map<any>).doc!;
    doc.transact(() => {
      const prompts = template?.prompts || {};
      const promptId = Object.keys(prompts).find((x) => {
        return (prompts[x]?.data?.data as ExecuteBlockYjs)?.type === 'dataset';
      });

      if (promptId) {
        delete template.prompts![promptId];
        sortBy(Object.values(template.prompts!), (i) => i.index).forEach((i, index) => (i.index = index));
      }
    });
  }, [template]);

  const renameVariable = useCallback(() => {
    // FIXME:
    // (rename: { [key: string]: string }) => {
    // if (!template) return;
    // const doc = (getYjsValue(template) as Map<any>).doc!;
    // doc.transact(() => {
    //   if (!template.prompts) return;
    //   for (const { data } of Object.values(template.prompts)) {
    //     if (isPromptMessage(data) && data.content) {
    //       data.content = renameVariableByMustache(data.content, rename);
    //     } else if ((isCallPromptMessage(data) || isCallMacroMessage(data)) && data.parameters) {
    //       for (const param of Object.keys(data.parameters)) {
    //         const val = data.parameters[param];
    //         if (typeof val === 'string') {
    //           data.parameters[param] = renameVariableByMustache(val, rename);
    //         }
    //       }
    //     } else if (isCallAPIMessage(data)) {
    //       if (data.url) {
    //         data.url = renameVariableByMustache(data.url, rename);
    //       }
    //       if (data.body) {
    //         data.body = renameVariableByMustache(data.body, rename);
    //       }
    //     } else if (isCallDatasetMessage(data)) {
    //       if (data.parameters?.query) {
    //         data.parameters.query = renameVariableByMustache(data.parameters.query, rename);
    //       }
    //     }
    //   }
    // });
  }, [template]);

  const addCustomPrompt = useCallback(
    (type: 'knowledge' | 'history' | 'getStore' | 'setStore') => {
      if (!template) return;

      const doc = (getYjsValue(template) as Map<any>).doc!;
      doc.transact(() => {
        template.prompts ??= {};

        const promptMAP: { [key: string]: PromptYjs } = {
          knowledge: {
            type: 'executeBlock',
            data: {
              id: nextAssistantId(),
              selectType: 'all',
              role: 'system',
              type,
              prefix: 'Please use the following as context:',
              tools: {
                'AI-Studio:/api/datasets/{knowledgeId}/search:get': {
                  index: 0,
                  data: {
                    id: 'AI-Studio:/api/datasets/{knowledgeId}/search:get',
                    from: 'blockletAPI',
                    parameters: {
                      knowledgeId: '{{knowledgeId}}',
                      message: '',
                    },
                  },
                },
              },
            },
          },
          history: {
            type: 'executeBlock',
            data: {
              id: nextAssistantId(),
              selectType: 'all',
              role: 'system',
              type,
              prefix: '',
              tools: {
                'AI-Studio:/api/messages:get': {
                  index: 0,
                  data: {
                    id: 'AI-Studio:/api/messages:get',
                    from: 'blockletAPI',
                    parameters: {
                      limit: '',
                      keyword: '',
                    },
                  },
                },
              },
            },
          },
          getStore: {
            type: 'executeBlock',
            data: {
              id: nextAssistantId(),
              selectType: 'all',
              role: 'system',
              type,
              prefix: '',
              tools: {
                'AI-Studio:/api/datastore:get': {
                  index: 0,
                  data: {
                    id: 'AI-Studio:/api/datastore:get',
                    from: 'blockletAPI',
                    parameters: {
                      key: '',
                      scope: '',
                    },
                  },
                },
              },
            },
          },
          setStore: {
            type: 'executeBlock',
            data: {
              id: nextAssistantId(),
              selectType: 'all',
              role: 'system',
              type,
              prefix: '',
              tools: {
                'AI-Studio:/api/datastore:post': {
                  index: 0,
                  data: {
                    id: 'AI-Studio:/api/datastore:post',
                    from: 'blockletAPI',
                    parameters: {
                      reset: 'true',
                      key: '',
                      scope: 'session',
                      data: '',
                    },
                  },
                },
              },
            },
          },
        };

        const prompt = promptMAP[type];

        if (prompt) {
          template.prompts[prompt.data.id] = {
            index: Object.keys(template.prompts).length,
            data: prompt,
          };

          sortBy(Object.values(template.prompts), (i) => i.index).forEach((i, index) => (i.index = index));
        }
      });
    },
    [template]
  );

  const assistantParameters = [
    ...new Set([
      ...Object.values(template?.parameters ?? {})
        .filter((i) => !i.data.hidden)
        .map((i) => i.data.key),
    ]),
  ];

  useEffect(() => {
    if (template) {
      if (assistantParameters.includes('datasetId') || assistantParameters.includes('knowledgeId')) {
        addDatasetPrompt();
      } else {
        deleteDatasetPrompt();
      }
    }
  }, [assistantParameters]);

  return {
    addPrompt,
    copePrompt,
    deletePrompt,
    addDatasetPrompt,
    deleteDatasetPrompt,
    addCustomPrompt,
    renameVariable,
  };
}
