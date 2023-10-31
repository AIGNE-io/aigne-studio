import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { EditorState } from '@blocklet/prompt-editor';
import { editorState2Text, text2EditorState } from '@blocklet/prompt-editor/utils';
import { useAsyncEffect, useThrottleFn } from 'ahooks';
import Joi from 'joi';
import sortBy from 'lodash/sortBy';
import Mustache from 'mustache';
import { useCallback } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import { Role } from '../../../api/src/store/templates';
import { isTemplate, useStore } from './yjs-state';

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

  const id = Object.entries(store.tree).find((i) => i[1]?.endsWith(`${templateId}.yaml`))?.[0];
  const file = id ? store.files[id] : undefined;
  const template = isTemplate(file) ? file : undefined;
  const prompt = template?.prompts?.[promptId];

  const [state, setState] = useRecoilState(promptState(projectId, gitRef, templateId, promptId));

  const emitChange = useThrottleFn(
    async () => {
      const { editorState } = state;
      if (!editorState) return;
      const { content, role = 'user' } = await editorState2Text(editorState);
      if (state.content !== content || state.role !== role) {
        state.content = content;
        state.role = role;

        if (prompt && template.prompts) {
          state.directives = parseDirectives(
            ...Object.values(template.prompts)
              .map((i) => (i.data.id === promptId ? content : i.data.content))
              .filter((i): i is string => !!i)
          );

          // if (template.type === 'branch') {
          //   variables.add('question');
          // }
          // if (template.type === 'image') {
          //   variables.add('size');
          //   variables.add('number');
          // }

          const doc = (getYjsValue(prompt) as Map<any>).doc!;
          doc.transact(() => {
            prompt.data.content = content;
            prompt.data.role = role;

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
      setState((v) => ({ ...v, editorState }));
      emitChange.run();
    },
    [emitChange, state]
  );

  useAsyncEffect(async () => {
    if (!prompt) return;
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

type Directive =
  | {
      type: 'variable';
      name: string;
    }
  | {
      type: 'callPrompt';
      template?: { id: string; name?: string };
      deps: Directive[];
    };

const callPromptChildSchema = Joi.object<{
  template?: { id: string; name?: string };
  parameters?: {
    [key: string]: string | number | undefined;
  };
}>({
  template: Joi.object({
    id: Joi.string().required(),
    name: Joi.string().empty([null, '']),
  }),
  parameters: Joi.object().pattern(Joi.string(), Joi.any()),
});

function parseDirectives(...content: string[]): Directive[] {
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
        case '#': {
          if (span[1] === 'callPrompt') {
            const child = content.slice(span[3], span[5]);
            try {
              const json = callPromptChildSchema.validate(JSON.parse(child), { stripUnknown: true });
              if (json.error) throw json.error;
              directives.push({
                type: 'callPrompt',
                template: json.value.template,
                deps: parseDirectives(
                  ...Object.values(json.value.parameters ?? []).filter((i): i is string => typeof i === 'string')
                ),
              });
            } catch (error) {
              console.error('JSON.parse callPrompt child error', child, error);
            }
          }
          break;
        }
        default:
          console.warn('Unknown directive', span);
      }
    }

    return directives;
  });
}
