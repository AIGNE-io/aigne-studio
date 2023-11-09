import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { EditorState } from '@blocklet/prompt-editor';
import { editorState2Text, text2EditorState } from '@blocklet/prompt-editor/utils';
import { useAsyncEffect, useThrottleFn } from 'ahooks';
import sortBy from 'lodash/sortBy';
import Mustache from 'mustache';
import { useCallback } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import { TemplateYjs } from '../../../api/src/store/projects';
import { Role } from '../../../api/src/store/templates';
import { isPromptMessage, isTemplate, useStore } from './yjs-state';

export interface PromptState {
  projectId: string;
  gitRef: string;
  promptId: string;
  content?: string;
  role?: Role;
  editorState?: EditorState;
  directives?: Directive[];
}

const promptStates: { [key: string]: RecoilState<PromptState> } = {};

const promptState = (projectId: string, gitRef: string, templateId: string, promptId: string) => {
  const key = `${projectId}-${gitRef}-${templateId}-${promptId}`;

  promptStates[key] ??= atom<PromptState>({
    key: `promptState-${key}`,
    default: { projectId, gitRef, promptId },
    dangerouslyAllowMutability: true,
  });

  return promptStates[key]!;
};

export function usePromptState({
  projectId,
  gitRef,
  templateId,
  promptId,
}: {
  projectId: string;
  gitRef: string;
  templateId: string;
  promptId: string;
}) {
  const { store } = useStore(projectId, gitRef);

  const file = store.files[templateId];
  const template = isTemplate(file) ? file : undefined;
  const prompt = template?.prompts?.[promptId];

  const [state] = useRecoilState(promptState(projectId, gitRef, templateId, promptId));

  const emitChange = useThrottleFn(
    async () => {
      const { editorState } = state;
      if (!editorState) return;
      const { content, role = 'user' } = await editorState2Text(editorState);
      if (state.content !== content || state.role !== role) {
        state.content = content;
        state.role = role;

        const p = prompt && isPromptMessage(prompt.data) ? prompt.data : undefined;
        if (p) {
          // state.directives = parseDirectives(
          //   ...Object.values(template.prompts)
          //     .map((i) => (i.data.id === promptId ? content : i.data.content))
          //     .filter((i): i is string => !!i)
          // );

          // if (template.type === 'branch') {
          //   variables.add('question');
          // }
          // if (template.type === 'image') {
          //   variables.add('size');
          //   variables.add('number');
          // }

          const doc = (getYjsValue(prompt) as Map<any>).doc!;
          doc.transact(() => {
            p.content = content;
            p.role = role;

            // template.parameters ??= {};
            // for (const param of variables) {
            //   template.parameters[param] ??= {};
            // }
            // for (const [key] of Object.entries(template.parameters)) {
            //   if (template.type === 'branch' && key === 'question') {
            //     continue;
            //   }
            //   if (template.type === 'image' && ['size', 'number'].includes(key)) {
            //     continue;
            //   }
            //   if (!variables.has(key)) {
            //     delete template.parameters[key];
            //   }
            // }
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
      state.editorState = editorState;
      emitChange.run();
    },
    [emitChange, state]
  );

  useAsyncEffect(async () => {
    if (!prompt) return;
    if (!isPromptMessage(prompt.data)) return;
    const { content, role } = prompt.data;
    if (state.content !== content || state.role !== role) {
      state.content = content;
      state.role = role;

      const editorState = await text2EditorState(content, role);
      setEditorState(editorState);
    }
  }, [prompt?.data.content, prompt?.data.role]);

  return { state, prompt, setEditorState, deletePrompt };
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
        default:
          console.warn('Unknown directive', span);
      }
    }

    return directives;
  });
}

export function parseDirectivesOfTemplate(template: TemplateYjs) {
  return parseDirectives(
    ...Object.values(template.prompts ?? {})
      .map((i) => i.data.content)
      .filter((i): i is string => Boolean(i))
  );
}
