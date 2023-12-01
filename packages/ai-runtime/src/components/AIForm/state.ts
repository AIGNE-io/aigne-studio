import { useCallback } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import { PublicTemplate, executeTemplate, getTemplate } from '../../api/templates';

export interface TemplateIdentifier {
  projectId: string;
  gitRef: string;
  templateId: string;
  working?: boolean;
}

export interface TemplateState {
  identifier: TemplateIdentifier;
  loading?: boolean;
  error?: Error;
  template?: PublicTemplate;
}

const TEMPLATE_STATES: { [key: string]: RecoilState<TemplateState> } = {};

const templateState = ({ projectId, gitRef, templateId, working = false }: TemplateIdentifier) => {
  const key = ['AITemplateState', projectId, gitRef, templateId, working].join('/');

  TEMPLATE_STATES[key] ??= atom<TemplateState>({
    key,
    default: { identifier: { projectId, gitRef, templateId, working } },
  });

  return TEMPLATE_STATES[key]!;
};

export const useTemplateState = (identifier: TemplateIdentifier) => {
  const [state, setState] = useRecoilState(templateState(identifier));

  const reload = useCallback(async () => {
    setState((state) => ({ ...state, loading: true, error: undefined }));
    try {
      const template = await getTemplate(state.identifier);
      setState((state) => ({ ...state, loading: false, template }));
    } catch (error) {
      setState((state) => ({ ...state, loading: false, error }));
    }
  }, [setState, state.identifier]);

  return { state, setState, reload };
};

export interface ExecutingState {
  identifier: TemplateIdentifier;
  content?: string;
  images?: { url: string }[];
  done?: boolean;
  loading?: boolean;
  cancelled?: boolean;
  error?: Error;
}

const EXECUTING_STATES: { [key: string]: RecoilState<ExecutingState> } = {};

const executingState = ({ projectId, gitRef, templateId, working = false }: TemplateIdentifier) => {
  const key = ['AIFormExecutingState', projectId, gitRef, templateId, working].join('/');

  EXECUTING_STATES[key] ??= atom<ExecutingState>({
    key,
    default: { identifier: { projectId, gitRef, templateId, working } },
  });

  return EXECUTING_STATES[key]!;
};

export const useExecutingState = (identifier: TemplateIdentifier) => {
  const [state, setState] = useRecoilState(executingState(identifier));

  const execute = useCallback(
    async ({ parameters }: { parameters: { [key: string]: string | number | undefined } }) => {
      setState((state) => ({ identifier: state.identifier, loading: true }));
      try {
        const result = await executeTemplate({ ...state.identifier, parameters });

        const reader = result.getReader();
        const decoder = new TextDecoder();

        const isImages = (i: any): i is { type: 'images'; images: { url: string }[] } => i.type === 'images';

        for (;;) {
          let content = '';

          const { value, done } = await reader.read();
          if (value) {
            if (value instanceof Uint8Array) {
              content = decoder.decode(value);
            } else if (typeof value === 'string') {
              content = value;
            } else if (isImages(value)) {
              setState((state) => {
                if (!state.loading) return state;
                return { ...state, images: value.images };
              });
            }

            if (content) {
              setState((state) => {
                if (!state.loading) return state;
                return { ...state, content: (state.content || '') + content };
              });
            }
          }

          if (done) {
            break;
          }
        }

        setState((state) => ({ ...state, loading: false, done: true }));
      } catch (error) {
        setState((state) => ({ ...state, loading: false, done: true, error }));
        throw error;
      }
    },
    [setState, state.identifier]
  );

  const cancel = useCallback(() => {
    setState((state) => ({
      ...state,
      loading: false,
      cancelled: true,
    }));
  }, [setState]);

  return { state, setState, execute, cancel };
};
