import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { ComponentPickerOption, EditorState, INSERT_VARIABLE_COMMAND } from '@blocklet/prompt-editor';
import { editorState2Text, text2EditorState } from '@blocklet/prompt-editor/utils';
import { useAsyncEffect, useThrottleFn } from 'ahooks';
import { toPath } from 'lodash';
import sortBy from 'lodash/sortBy';
import { customAlphabet } from 'nanoid';
import { useCallback, useId, useMemo, useRef } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import Mustache from '../../../api/src/libs/mustache';
import { TemplateYjs } from '../../../api/src/store/projects';
import { CallDatasetMessage, CallPromptMessage, Role } from '../../../api/src/store/templates';
import {
  isCallAPIMessage,
  isCallDatasetMessage,
  isCallPromptMessage,
  isPromptMessage,
  isTemplate,
  useStore,
} from './yjs-state';

const PROMPT_EDITOR_STATE_CACHE: { [key: string]: { content?: string; role?: Role } } = {};

function getPromptEditorStateCache(key: string) {
  PROMPT_EDITOR_STATE_CACHE[key] ??= {};
  return PROMPT_EDITOR_STATE_CACHE[key]!;
}

export interface PromptEditorState {
  editorState?: EditorState;
}

const promptEditorStates: { [key: string]: RecoilState<PromptEditorState> } = {};

const promptEditorState = (key: string) => {
  promptEditorStates[key] ??= atom<PromptEditorState>({
    key,
    default: {},
  });

  return promptEditorStates[key]!;
};

export function usePromptState({
  projectId,
  gitRef,
  templateId,
  promptId,
  readOnly,
  originTemplate,
}: {
  projectId: string;
  gitRef: string;
  templateId: string;
  promptId: string;
  readOnly?: boolean;
  originTemplate?: TemplateYjs;
}) {
  const editorId = useId();

  const key = useMemo(
    () => ['promptState', projectId, gitRef, templateId, promptId, readOnly, editorId].join('/'),
    [projectId, gitRef, templateId, promptId, readOnly, editorId]
  );
  const [state, setState] = useRecoilState(promptEditorState(key));

  const cache = useMemo(() => getPromptEditorStateCache(key), [key]);

  const { getTemplateById } = useStore(projectId, gitRef);
  const template = getTemplateById(templateId);
  const prompt = readOnly ? originTemplate?.prompts?.[promptId] : template?.prompts?.[promptId];

  const emitChange = useThrottleFn(
    async ({ editorState }: { editorState: EditorState }) => {
      if (readOnly) return;

      const { content, role = 'user' } = await editorState2Text(editorState);

      if (cache.content !== content || cache.role !== role) {
        cache.content = content;
        cache.role = role;

        const p = prompt && isPromptMessage(prompt.data) ? prompt.data : undefined;
        if (p) {
          const doc = (getYjsValue(prompt) as Map<any>).doc!;
          doc.transact(() => {
            p.content = content;
            p.role = role;
          });
        }
      }
    },
    { wait: 1000, trailing: true }
  );

  const deletePrompt = useCallback(
    (promptId: string) => {
      if (!template) return;
      const doc = (getYjsValue(template) as Map<any>).doc!;
      doc.transact(() => {
        if (template.prompts) {
          delete template.prompts[promptId];
          sortBy(Object.values(template.prompts), (i) => i.index).forEach((i, index) => (i.index = index));
        }
      });
    },
    [template]
  );

  const setEditorState = useCallback(
    (editorState: EditorState) => {
      if (readOnly) return;

      setState((v) => ({ ...v, editorState }));
      emitChange.run({ editorState });
    },
    [emitChange, setState, readOnly]
  );

  useAsyncEffect(async () => {
    if (!prompt) return;
    if (!isPromptMessage(prompt.data)) return;
    const { content, role } = prompt.data;
    if (cache.content !== content || cache.role !== role) {
      cache.content = content;
      cache.role = role;

      const editorState = await text2EditorState(content, role);
      setState((v) => ({ ...v, editorState }));
    }
  }, [prompt?.data.content, prompt?.data.role, readOnly]);

  return { state, prompt, setEditorState, deletePrompt };
}

export function useParameterState({
  projectId,
  gitRef,
  templateId,
  prompt,
  param,
}: {
  projectId: string;
  gitRef: string;
  templateId: string;
  prompt: CallPromptMessage | CallDatasetMessage;
  param: string;
}) {
  const content = isCallDatasetMessage(prompt) ? prompt.parameters?.query : prompt.parameters?.[param];

  const key = useMemo(
    () => ['promptState', projectId, gitRef, templateId, prompt.id, param].join('/'),
    [projectId, gitRef, templateId, prompt.id, param]
  );
  const [state, setState] = useRecoilState(promptEditorState(key));

  const cache = useMemo(() => getPromptEditorStateCache(key), [key]);

  const emitChange = useThrottleFn(
    async ({ editorState }: { editorState: EditorState }) => {
      const { content } = await editorState2Text(editorState);

      if (cache.content !== content) {
        cache.content = content;

        const doc = (getYjsValue(prompt) as Map<any>).doc!;
        doc.transact(() => {
          prompt.parameters ??= {};
          prompt.parameters[param] = content;
        });
      }
    },
    { wait: 1000, trailing: true }
  );

  const setEditorState = useCallback(
    (editorState: EditorState) => {
      setState((v) => ({ ...v, editorState }));
      emitChange.run({ editorState });
    },
    [emitChange, setState]
  );

  useAsyncEffect(async () => {
    if (cache.content !== content) {
      cache.content = content;

      const editorState = await text2EditorState(content);
      setState((v) => ({ ...v, editorState }));
    }
  }, [content]);

  return { state, setEditorState };
}

export function useEditorPicker({
  projectId,
  gitRef,
  templateId,
}: {
  projectId: string;
  gitRef: string;
  templateId: string;
}) {
  const { addPrompt } = usePromptsState({ projectId, gitRef, templateId });
  const randomVariableNamePrefix = 'var-';
  const { t } = useLocaleContext();

  const getOptions = useCallback(
    (index?: number) => [
      new ComponentPickerOption(t('call.list.prompt'), {
        keywords: ['execute', 'prompt'],
        onSelect: (editor) => {
          const variable = `${randomVariableNamePrefix}${randomId(5)}`;
          const id = randomId();
          addPrompt({ id, role: 'call-prompt', output: variable }, index || 0);
          editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: variable });
        },
      }),
      new ComponentPickerOption(t('call.list.api'), {
        keywords: ['execute', 'api', 'call'],
        onSelect: (editor) => {
          const variable = `${randomVariableNamePrefix}${randomId(5)}`;
          const id = randomId();
          addPrompt({ id, role: 'call-api', output: variable, method: 'get', url: '' }, index || 0);
          editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: variable });
        },
      }),
      new ComponentPickerOption(t('call.list.func'), {
        keywords: ['execute', 'function', 'call'],
        onSelect: (editor) => {
          const variable = `${randomVariableNamePrefix}${randomId(5)}`;
          const id = randomId();
          addPrompt({ id, role: 'call-function', output: variable }, index || 0);
          editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: variable });
        },
      }),
      new ComponentPickerOption(t('call.list.dataset'), {
        keywords: ['query', 'dataset'],
        onSelect: (editor) => {
          const variable = `${randomVariableNamePrefix}${randomId(5)}`;
          const id = randomId();
          addPrompt({ id, role: 'call-dataset', output: variable, parameters: { query: '' } }, index || 0);
          editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: variable });
        },
      }),
    ],
    [addPrompt, t]
  );

  return { getOptions };
}

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

export function parseDirectivesOfTemplate(
  template: TemplateYjs,
  {
    excludeNonPromptVariables = false,
    includePromptVariables: includeEmptyPromptVariables = false,
  }: {
    excludeNonPromptVariables?: boolean;
    includePromptVariables?: boolean;
  } = {}
) {
  let directives = parseDirectives(
    ...Object.values(template.prompts ?? {})
      .flatMap(({ data }) => {
        if (isPromptMessage(data)) return data.content;
        if (isCallPromptMessage(data) && data.parameters) return Object.values(data.parameters);
        if (isCallAPIMessage(data) && data.url) {
          if (data.body) {
            return [data.url, data.body];
          }

          return [data.url];
        }
        if (isCallDatasetMessage(data) && data.parameters) return Object.values(data.parameters);

        return [];
      })
      .filter((i): i is string => typeof i === 'string')
  );

  if (excludeNonPromptVariables && template.prompts) {
    const outputs = new Set(
      Object.values(template.prompts)
        .map(({ data }) => (isPromptMessage(data) ? undefined : data.output))
        .filter(Boolean)
    );

    directives = directives.filter((i) => {
      if (i.type !== 'variable') return true;
      const variableEntry = toPath(i.name)[0];
      return !outputs.has(variableEntry);
    });
  }

  if (includeEmptyPromptVariables && template.prompts) {
    Object.values(template.prompts ?? {}).forEach(({ data }) => {
      if (isCallPromptMessage(data) && data.parameters) {
        Object.entries(data.parameters).forEach(([key, value]) => {
          if (!value) {
            directives.push({ type: 'variable', name: key });
          }
        });
      }
    });
  }

  return directives;
}

export function useParametersState(template: TemplateYjs) {
  const keysSet = new Set(
    parseDirectivesOfTemplate(template, { excludeNonPromptVariables: true, includePromptVariables: true })
      .map((i) => (i.type === 'variable' ? i.name : undefined))
      .filter((i): i is string => Boolean(i))
  );

  const keys = [...keysSet];

  const key = keys.join('/');
  const previousKey = useRef<string>(key);

  const updateParametersIfNeeded = useCallback(() => {
    if (template && previousKey.current !== key) {
      previousKey.current = key;

      const doc = (getYjsValue(template) as Map<any>).doc!;
      doc.transact(() => {
        template.parameters ??= {};

        for (const param of Object.keys(template.parameters)) {
          if (!keys.includes(param)) {
            delete template.parameters[param];
          }
        }

        for (const param of keys) {
          template.parameters[param] ??= {};
        }
      });
    }
  }, [key, template]);

  return { keysSet, keys, updateParametersIfNeeded };
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
  const { store } = useStore(projectId, gitRef);

  const file = store.files[templateId];
  const template = isTemplate(file) ? file : undefined;

  const addPrompt = useCallback(
    (prompt: NonNullable<TemplateYjs['prompts']>[string]['data'], index?: number) => {
      if (!template) return;

      const doc = (getYjsValue(template) as Map<any>).doc!;
      doc.transact(() => {
        template.prompts ??= {};

        template.prompts[prompt.id] = {
          index: typeof index === 'number' ? index - 0.1 : Object.keys(template.prompts).length,
          data: prompt,
        };

        sortBy(Object.values(template.prompts), (i) => i.index).forEach((i, index) => (i.index = index));
      });
    },
    [template]
  );

  const renameVariable = useCallback(
    (rename: { [key: string]: string }) => {
      if (!template) return;

      const doc = (getYjsValue(template) as Map<any>).doc!;
      doc.transact(() => {
        if (!template.prompts) return;

        for (const { data } of Object.values(template.prompts)) {
          if (isPromptMessage(data) && data.content) {
            data.content = renameVariableByMustache(data.content, rename);
          } else if (isCallPromptMessage(data) && data.parameters) {
            for (const param of Object.keys(data.parameters)) {
              const val = data.parameters[param];
              if (typeof val === 'string') {
                data.parameters[param] = renameVariableByMustache(val, rename);
              }
            }
          } else if (isCallAPIMessage(data)) {
            if (data.url) {
              data.url = renameVariableByMustache(data.url, rename);
            }

            if (data.body) {
              data.body = renameVariableByMustache(data.body, rename);
            }
          } else if (isCallDatasetMessage(data)) {
            if (data.parameters?.query) {
              data.parameters.query = renameVariableByMustache(data.parameters.query, rename);
            }
          }
        }
      });
    },
    [template]
  );

  return { addPrompt, renameVariable };
}

export function useToolsState({
  projectId,
  gitRef,
  templateId,
}: {
  projectId: string;
  gitRef: string;
  templateId: string;
}) {
  const { store } = useStore(projectId, gitRef);

  const file = store.files[templateId];
  const template = isTemplate(file) ? file : undefined;

  const addFunc = useCallback(
    (func: NonNullable<TemplateYjs['tools']>[string]['data']) => {
      if (!template) return;

      const doc = (getYjsValue(template) as Map<any>).doc!;
      doc.transact(() => {
        template.tools ??= {};
        template.tools[func.id] = { index: Object.keys(template.tools).length, data: func };

        sortBy(Object.values(template.tools), (i) => i.index).forEach((i, index) => (i.index = index));
      });
    },
    [template]
  );

  const deleteFunc = useCallback(
    (id: string) => {
      if (!template) return;

      const doc = (getYjsValue(template) as Map<any>).doc!;

      doc.transact(() => {
        template.tools ??= {};
        delete template.tools[id];
      });
    },
    [template]
  );

  return { addFunc, deleteFunc };
}

export const randomId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

function renameVariableByMustache(content: string, rename: { [key: string]: string }) {
  let result = content;

  const spans = Mustache.parse(content);
  for (const span of spans.reverse()) {
    if (span[0] === 'name') {
      const newName = rename[span[1]];
      if (newName) {
        result = `${result.slice(0, span[2])}{{ ${newName} }}${result.slice(span[3])}`;
      }
    }
  }
  return result;
}
