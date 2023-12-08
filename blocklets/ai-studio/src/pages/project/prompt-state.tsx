import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import sortBy from 'lodash/sortBy';
import { customAlphabet } from 'nanoid';
import { useCallback } from 'react';

import Mustache from '../../../api/src/libs/mustache';
import { PromptFileYjs } from '../../../api/src/store/projects';
import { isPromptFileYjs, isPromptMessage, useProjectStore } from './yjs-state';

// export function useEditorPicker({
//   projectId,
//   gitRef,
//   templateId,
// }: {
//   projectId: string;
//   gitRef: string;
//   templateId: string;
// }) {
//   const { addPrompt } = usePromptsState({ projectId, gitRef, templateId });
//   const randomVariableNamePrefix = 'var-';
//   const { t } = useLocaleContext();

//   const getOptions = useCallback(
//     (index?: number) => [
//       new ComponentPickerOption(t('call.list.macro'), {
//         keywords: ['execute', 'prompt'],
//         onSelect: (editor) => {
//           const variable = `${randomVariableNamePrefix}${randomId(5)}`;
//           const id = randomId();
//           addPrompt({ id, role: 'call-macro', output: variable }, index || 0);
//           editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: variable });
//         },
//       }),
//       new ComponentPickerOption(t('call.list.prompt'), {
//         keywords: ['execute', 'prompt'],
//         onSelect: (editor) => {
//           const variable = `${randomVariableNamePrefix}${randomId(5)}`;
//           const id = randomId();
//           addPrompt({ id, role: 'call-prompt', output: variable }, index || 0);
//           editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: variable });
//         },
//       }),
//       new ComponentPickerOption(t('call.list.api'), {
//         keywords: ['execute', 'api', 'call'],
//         onSelect: (editor) => {
//           const variable = `${randomVariableNamePrefix}${randomId(5)}`;
//           const id = randomId();
//           addPrompt({ id, role: 'call-api', output: variable, method: 'get', url: '' }, index || 0);
//           editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: variable });
//         },
//       }),
//       new ComponentPickerOption(t('call.list.func'), {
//         keywords: ['execute', 'function', 'call'],
//         onSelect: (editor) => {
//           const variable = `${randomVariableNamePrefix}${randomId(5)}`;
//           const id = randomId();
//           addPrompt({ id, role: 'call-function', output: variable }, index || 0);
//           editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: variable });
//         },
//       }),
//       new ComponentPickerOption(t('call.list.dataset'), {
//         keywords: ['query', 'dataset'],
//         onSelect: (editor) => {
//           const variable = `${randomVariableNamePrefix}${randomId(5)}`;
//           const id = randomId();
//           addPrompt({ id, role: 'call-dataset', output: variable, parameters: { query: '' } }, index || 0);
//           editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: variable });
//         },
//       }),
//     ],
//     [addPrompt, t]
//   );

//   return { getOptions };
// }

type Directive = {
  type: 'variable';
  name: string;
};

export function parseDirectives(...content: string[]): Directive[] {
  return content.flatMap((content) => {
    // 捕获 api/{{var/api/task/{{list}} 这种错误
    try {
      const spans = Mustache.parse(content);

      const directives: Directive[] = [];

      for (const span of spans) {
        switch (span[0]) {
          case 'name': {
            const name = span[1];
            if (name) directives.push({ type: 'variable', name });
            break;
          }
          case 'text': {
            break;
          }
          default:
            console.warn('Unknown directive', span);
        }
      }

      return directives;
    } catch (error) {
      return [];
    }
  });
}

export function parseDirectivesOfTemplate(template: PromptFileYjs) {
  return parseDirectives(
    ...Object.values(template.prompts ?? {})
      .flatMap(({ data }) => {
        if (isPromptMessage(data)) return data.data.content;
        // if ((isCallPromptMessage(data) || isCallMacroMessage(data)) && data.parameters)
        //   return Object.values(data.parameters);
        // if (isCallAPIMessage(data) && data.url) {
        //   if (data.body) {
        //     return [data.url, data.body];
        //   }

        //   return [data.url];
        // }
        // if (isCallDatasetMessage(data) && data.parameters) return Object.values(data.parameters);

        return [];
      })
      .filter((i): i is string => typeof i === 'string')
  );

  // if (excludeNonPromptVariables && template.prompts) {
  //   const outputs = new Set(
  //     Object.values(template.prompts)
  //       .map(({ data }) => (isPromptMessage(data) ? undefined : data.output))
  //       .filter(Boolean)
  //   );

  //   directives = directives.filter((i) => {
  //     if (i.type !== 'variable') return true;
  //     const variableEntry = toPath(i.name)[0];
  //     return !outputs.has(variableEntry);
  //   });
  // }

  // if (includeEmptyPromptVariables && template.prompts) {
  //   Object.values(template.prompts ?? {}).forEach(({ data }) => {
  //     if ((isCallPromptMessage(data) || isCallMacroMessage(data)) && data.parameters) {
  //       Object.entries(data.parameters).forEach(([key, value]) => {
  //         if (!value) {
  //           directives.push({ type: 'variable', name: key });
  //         }
  //       });
  //     }
  //   });
  // }
}

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
  const template = isPromptFileYjs(file) ? file : undefined;

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

  const deletePrompt = useCallback(({ promptId }: { promptId: string }) => {
    if (!template?.prompts) return;

    const doc = (getYjsValue(template) as Map<any>).doc!;
    doc.transact(() => {
      delete template.prompts![promptId];
      sortBy(Object.values(template.prompts!), (i) => i.index).forEach((i, index) => (i.index = index));
    });
  }, []);

  const renameVariable = useCallback(() => {
    // (rename: { [key: string]: string }) => {
    // if (!template) return;
    // const doc = (getYjsValue(template) as Map<any>).doc!;
    // FIXME:
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

// export function useToolsState({
//   projectId,
//   gitRef,
//   templateId,
// }: {
//   projectId: string;
//   gitRef: string;
//   templateId: string;
// }) {
//   const { store } = useProjectStore(projectId, gitRef);

//   const file = store.files[templateId];
//   const template = file && isPromptFileYjs(file) ? file : undefined;

//   const addToolFunc = useCallback(
//     (func: NonNullable<TemplateYjs['tools']>[string]['data']) => {
//       if (!template) return;

//       const doc = (getYjsValue(template) as Map<any>).doc!;
//       doc.transact(() => {
//         template.tools ??= {};
//         template.tools[func.id] = { index: Object.keys(template.tools).length, data: func };

//         sortBy(Object.values(template.tools), (i) => i.index).forEach((i, index) => (i.index = index));
//       });
//     },
//     [template]
//   );

//   const deleteToolFunc = useCallback(
//     (id: string) => {
//       if (!template) return;

//       const doc = (getYjsValue(template) as Map<any>).doc!;

//       doc.transact(() => {
//         template.tools ??= {};
//         delete template.tools[id];
//       });
//     },
//     [template]
//   );

//   return { addToolFunc, deleteToolFunc };
// }

export const randomId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

// function renameVariableByMustache(content: string, rename: { [key: string]: string }) {
//   let result = content;

//   const spans = Mustache.parse(content);
//   for (const span of spans.reverse()) {
//     if (span[0] === 'name') {
//       const newName = rename[span[1]];
//       if (newName) {
//         result = `${result.slice(0, span[2])}{{ ${newName} }}${result.slice(span[3])}`;
//       }
//     }
//   }
//   return result;
// }
