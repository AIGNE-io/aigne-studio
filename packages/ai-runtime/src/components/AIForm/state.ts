import { useCallback } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';
import { joinURL } from 'ufo';

import { AIStudioBaseUrl } from '../../api/api';
import { AssistantInfo, getAssistant, runAssistant } from '../../api/assistant';
import { AssistantResponseType } from '../../core';

export interface AssistantIdentifier {
  projectId: string;
  gitRef: string;
  assistantId: string;
  working?: boolean;
}

export interface AssistantState {
  identifier: AssistantIdentifier;
  loading?: boolean;
  error?: Error;
  assistant?: AssistantInfo;
}

const ASSISTANT_STATES: { [key: string]: RecoilState<AssistantState> } = {};

const assistantState = ({ projectId, gitRef, assistantId, working = false }: AssistantIdentifier) => {
  const key = ['AIRuntimeAssistantState', projectId, gitRef, assistantId, working].join('/');

  ASSISTANT_STATES[key] ??= atom<AssistantState>({
    key,
    default: { identifier: { projectId, gitRef, assistantId, working } },
  });

  return ASSISTANT_STATES[key]!;
};

export const useAssistantState = (identifier: AssistantIdentifier) => {
  const [state, setState] = useRecoilState(assistantState(identifier));

  const reload = useCallback(async () => {
    setState((state) => ({ ...state, loading: true, error: undefined }));
    try {
      const assistant = await getAssistant(state.identifier);
      setState((state) => ({ ...state, loading: false, assistant }));
    } catch (error) {
      setState((state) => ({ ...state, loading: false, error }));
    }
  }, [setState, state.identifier]);

  return { state, setState, reload };
};

export interface ExecutingState {
  identifier: AssistantIdentifier;
  content?: string;
  images?: { url?: string; b64Json?: string }[];
  done?: boolean;
  loading?: boolean;
  cancelled?: boolean;
  error?: Error;
}

const EXECUTING_STATES: { [key: string]: RecoilState<ExecutingState> } = {};

const executingState = ({ projectId, gitRef, assistantId, working = false }: AssistantIdentifier) => {
  const key = ['AIFormExecutingState', projectId, gitRef, assistantId, working].join('/');

  EXECUTING_STATES[key] ??= atom<ExecutingState>({
    key,
    default: { identifier: { projectId, gitRef, assistantId, working } },
  });

  return EXECUTING_STATES[key]!;
};

export const useExecutingState = (identifier: AssistantIdentifier) => {
  const [state, setState] = useRecoilState(executingState(identifier));

  const execute = useCallback(
    async ({ parameters }: { parameters: { [key: string]: string | number | undefined } }) => {
      setState((state) => ({ identifier: state.identifier, loading: true }));
      try {
        const result = await runAssistant({
          url: joinURL(AIStudioBaseUrl, '/api/ai/call'),
          ...state.identifier,
          ref: state.identifier.gitRef,
          parameters,
        });

        const reader = result.getReader();
        let mainTaskId: string | undefined;

        for (;;) {
          const { value, done } = await reader.read();
          if (value) {
            if (value.type === AssistantResponseType.CHUNK) {
              mainTaskId ??= value.taskId;
              if (mainTaskId === value.taskId) {
                setState((state) => {
                  if (!state.loading) return state;

                  return {
                    ...state,
                    content: (state.content || '') + (value.delta.content || ''),
                    images: (state.images ?? []).concat(value.delta.images ?? []),
                  };
                });
              }
            } else if (value.type === AssistantResponseType.ERROR) {
              setState((state) => {
                if (!state.loading) return state;

                return {
                  ...state,
                  error: new Error(value.error.message),
                };
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
