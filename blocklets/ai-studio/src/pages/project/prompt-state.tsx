import { PromptFileYjs, isPromptFile } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import sortBy from 'lodash/sortBy';
import { useCallback } from 'react';

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
  const template = file && isPromptFile(file) ? file : undefined;

  const addPrompt = useCallback(
    (prompt: NonNullable<PromptFileYjs['prompts']>[string]['data'], index?: number) => {
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

  return { addPrompt, deletePrompt, renameVariable };
}
