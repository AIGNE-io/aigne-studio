import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { EditorState } from '@blocklet/prompt-editor';
import { editorState2Text, text2EditorState } from '@blocklet/prompt-editor/utils';
import { useAsyncEffect, useThrottleFn } from 'ahooks';
import sortBy from 'lodash/sortBy';
import { customAlphabet } from 'nanoid';
import { useCallback, useId, useMemo } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import Mustache from '../../../api/src/libs/mustache';
import { TemplateYjs } from '../../../api/src/store/projects';
import { CallDatasetMessage, CallPromptMessage, Role } from '../../../api/src/store/templates';
import {
  isCallAPIMessage,
  isCallDatasetMessage,
  isCallFuncMessage,
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
  const content = prompt.parameters?.[param] ?? '';

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

type Directive = {
  type: 'variable';
  name: string;
};

export function parseDirectives(...content: string[]): Directive[] {
  return content.flatMap((content) => {
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
  });
}

export function parseDirectivesOfMessages(template: TemplateYjs) {
  return parseDirectives(
    ...Object.values(template.prompts ?? {})
      .map((i) => i.data.content)
      .filter((i): i is string => Boolean(i))
  );
}

export function parseDirectivesOfTemplate(
  template: TemplateYjs,
  {
    excludeCallPromptVariables = false,
    excludeCallAPIVariables = false,
    excludeCallFuncVariables = false,
    excludeCallDatasetVariables = false,
  }: {
    excludeCallPromptVariables?: boolean;
    excludeCallAPIVariables?: boolean;
    excludeCallFuncVariables?: boolean;
    excludeCallDatasetVariables?: boolean;
  } = {}
) {
  let directives = parseDirectives(
    ...Object.values(template.prompts ?? {})
      .flatMap(({ data }) => {
        if (isPromptMessage(data)) return data.content;
        if (isCallPromptMessage(data) && data.parameters) return Object.values(data.parameters);
        if (isCallAPIMessage(data) && data.url) {
          if (data.params && typeof data.params === 'object') {
            return [data.url, ...Object.values(data.params)];
          }

          return [data.url];
        }
        if (isCallDatasetMessage(data) && data.parameters) return Object.values(data.parameters);

        return [];
      })
      .filter((i): i is string => typeof i === 'string')
  );

  if (excludeCallPromptVariables && template.prompts) {
    const outputs = new Set(
      Object.values(template.prompts)
        .map(({ data }) => (isCallPromptMessage(data) ? data.output : undefined))
        .filter(Boolean)
    );

    directives = directives.filter((i) => !(i.type === 'variable' && outputs.has(i.name)));
  }

  if (excludeCallAPIVariables && template.prompts) {
    const outputs = new Set(
      Object.values(template.prompts)
        .map(({ data }) => (isCallAPIMessage(data) ? data.output : undefined))
        .filter(Boolean)
    );

    directives = directives.filter((i) => !(i.type === 'variable' && outputs.has(i.name)));
  }

  if (excludeCallFuncVariables && template.prompts) {
    const outputs = new Set(
      Object.values(template.prompts)
        .map(({ data }) => (isCallFuncMessage(data) ? data.output : undefined))
        .filter(Boolean)
    );

    directives = directives.filter((i) => !(i.type === 'variable' && outputs.has(i.name)));
  }

  if (excludeCallDatasetVariables && template.prompts) {
    const outputs = new Set(
      Object.values(template.prompts)
        .map(({ data }) => (isCallDatasetMessage(data) ? data.output : undefined))
        .filter(Boolean)
    );

    directives = directives.filter((i) => !(i.type === 'variable' && outputs.has(i.name)));
  }

  return directives;
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
          } else if ((isCallAPIMessage(data) || isCallFuncMessage(data) || isCallDatasetMessage(data)) && data.output) {
            data.output = renameVariableByMustache(data.output, rename);
          }
        }
      });
    },
    [template]
  );

  return { addPrompt, renameVariable };
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
