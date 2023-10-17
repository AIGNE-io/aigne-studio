import produce, { Draft } from 'immer';
import { debounce, omit } from 'lodash';
import { nanoid } from 'nanoid';
import { ChatCompletionRequestMessage } from 'openai';
import { useCallback } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';
import { recoilPersist } from 'recoil-persist';

import { Project } from '../../../api/src/store/projects';
import { Role } from '../../../api/src/store/templates';
import { callAI, textCompletions } from '../../libs/ai';
import * as branchApi from '../../libs/branch';
import { Commit, getLogs } from '../../libs/log';
import * as projectApi from '../../libs/project';

export const defaultBranch = 'main';

export interface ProjectState {
  project?: Project;
  branches: string[];
  commits: Commit[];
  loading?: boolean;
  error?: Error;
}

const projectStates: { [key: string]: RecoilState<ProjectState> } = {};

const projectState = (projectId: string, gitRef: string) => {
  const key = `${projectId}-${gitRef}`;

  projectStates[key] ??= atom<ProjectState>({
    key: `projectState-${key}`,
    default: { branches: [], commits: [] },
  });

  return projectStates[key]!;
};

export const useProjectState = (projectId: string, gitRef: string) => {
  const [state, setState] = useRecoilState(projectState(projectId, gitRef));

  const refetch = useCallback(async () => {
    let loading: boolean | undefined = false;
    setState((v) => {
      loading = v.loading;
      return { ...v, loading: true };
    });
    if (loading) return;
    try {
      const [project, { branches }] = await Promise.all([
        projectApi.getProject(projectId),
        branchApi.getBranches({ projectId }),
      ]);
      const { commits } = await getLogs({ projectId, ref: project.gitType === 'simple' ? defaultBranch : gitRef });
      if (commits.length) commits[0]!.oid = defaultBranch;
      setState((v) => ({ ...v, project, branches, commits, error: undefined }));
    } catch (error) {
      setState((v) => ({ ...v, error }));
      throw error;
    } finally {
      setState((v) => ({ ...v, loading: false }));
    }
  }, [projectId, gitRef, setState]);

  const createBranch = useCallback(
    async (...args: Parameters<typeof branchApi.createBranch>) => {
      const { branches } = await branchApi.createBranch(...args);
      setState((v) => ({ ...v, branches }));
      return { branches };
    },
    [setState]
  );

  const updateBranch = useCallback(
    async (...args: Parameters<typeof branchApi.updateBranch>) => {
      const { branches } = await branchApi.updateBranch(...args);
      setState((v) => ({ ...v, branches }));
      return { branches };
    },
    [setState]
  );

  const deleteBranch = useCallback(
    async (...args: Parameters<typeof branchApi.deleteBranch>) => {
      const { branches } = await branchApi.deleteBranch(...args);
      setState((v) => ({ ...v, branches }));
      return { branches };
    },
    [setState]
  );

  const updateProject = useCallback(
    async (...args: Parameters<typeof projectApi.updateProject>) => {
      await projectApi.updateProject(...args);
      refetch();
    },
    [setState]
  );

  return { state, refetch, createBranch, updateBranch, deleteBranch, updateProject };
};

export interface SessionItem {
  index: number;
  createdAt: string;
  updatedAt: string;
  messages: {
    id: string;
    createdAt: string;
    role: Role;
    content: string;
    gitRef?: string;
    parameters?: { [key: string]: any };
    images?: { url: string }[];
    done?: boolean;
    loading?: boolean;
    cancelled?: boolean;
    error?: { message: string };
  }[];
  chatType?: 'chat' | 'debug';
  debugForm?: { [key: string]: any };
}

export interface DebugState {
  projectId: string;
  templateId: string;
  sessions: SessionItem[];
  nextSessionIndex: number;
  currentSessionIndex?: number;
}

const debugStates: { [key: string]: RecoilState<DebugState> } = {};

const debugState = (projectId: string, templateId: string) => {
  const key = `debugState-${projectId}-${templateId}` as const;

  debugStates[key] ??= atom<DebugState>({
    key,
    default: { projectId, templateId, sessions: [], nextSessionIndex: 1 },
    effects: [
      recoilPersist({
        key,
        converter: {
          stringify: (state: { [k: typeof key]: DebugState }) => {
            return JSON.stringify({
              ...state,
              [key]: {
                ...state[key],
                sessions: state[key]?.sessions.map((session) => ({
                  ...session,
                  messages: session.messages.map((i) => omit(i, 'loading')),
                })),
              },
            });
          },
          parse: JSON.parse,
        },
        storage: {
          getItem: (key) => localStorage.getItem(key),
          setItem: (() => {
            const setItem = debounce((k, v) => {
              localStorage.setItem(k, v);
            }, 1000);

            window.addEventListener('beforeunload', () => setItem.flush());

            return setItem;
          })(),
        },
      }).persistAtom,
    ],
  });

  return debugStates[key]!;
};

export const useDebugState = ({ projectId, templateId }: { projectId: string; templateId: string }) => {
  const [state, setState] = useRecoilState(debugState(projectId, templateId));

  const newSession = useCallback(() => {
    setState((state) => {
      const now = new Date().toISOString();
      const index = state.nextSessionIndex;

      return {
        ...state,
        sessions: [
          ...state.sessions,
          {
            index,
            createdAt: now,
            updatedAt: now,
            messages: [],
          },
        ],
        nextSessionIndex: index + 1,
        currentSessionIndex: index,
      };
    });
  }, [setState]);

  const setSession = useCallback(
    (index: number, recipe: (session: Draft<SessionItem>) => void) => {
      setState((state) =>
        produce(state, (state) => {
          const session = state.sessions.find((i) => i.index === index);
          if (session) recipe(session);
        })
      );
    },
    [setState]
  );

  const setCurrentSession = useCallback(
    (index?: number) => {
      setState((state) => {
        const session = state.sessions.find((i) => i.index === index) ?? state.sessions[state.sessions.length - 1];
        return { ...state, currentSessionIndex: session?.index };
      });
    },
    [setState]
  );

  const deleteSession = useCallback(
    (index: number) => {
      setState(({ sessions: [...sessions], ...state }) => {
        const i = sessions.findIndex((i) => i.index === index);
        if (i >= 0) sessions.splice(i, 1);
        return {
          ...state,
          sessions,
          currentSessionIndex:
            index === state.currentSessionIndex ? sessions[sessions.length - 1]?.index : state.currentSessionIndex,
        };
      });
    },
    [setState]
  );

  const setMessage = useCallback(
    (sessionIndex: number, messageId: string, recipe: (draft: Draft<SessionItem['messages'][number]>) => void) => {
      setState((state) =>
        produce(state, (state) => {
          const session = state.sessions.find((i) => i.index === sessionIndex);
          const message = session?.messages.find((i) => i.id === messageId);
          if (message) recipe(message);
          else console.error(`setMessage: message not found ${sessionIndex} ${messageId}`);
        })
      );
    },
    [setState]
  );

  const sendMessage = useCallback(
    async ({
      sessionIndex,
      message,
    }: {
      sessionIndex: number;
      message:
        | { type: 'chat'; content: string }
        | {
            type: 'debug';
            projectId: string;
            templateId: string;
            gitRef: string;
            parameters: { [key: string]: string | number };
          };
    }) => {
      const now = new Date();

      const messageId = `${now.getTime()}-${nanoid(16)}`;
      const responseId = `${messageId}-${1}`;

      setState((state) =>
        produce(state, (state) => {
          const session = state.sessions.find((i) => i.index === sessionIndex);
          session?.messages.push(
            {
              id: messageId,
              createdAt: now.toISOString(),
              role: 'user',
              content: message.type === 'chat' ? message.content : '',
              gitRef: message.type === 'debug' ? message.gitRef : undefined,
              parameters: message.type === 'debug' ? message.parameters : undefined,
            },
            { id: responseId, createdAt: now.toISOString(), role: 'assistant', content: '', loading: true }
          );
        })
      );

      const session = state.sessions.find((i) => i.index === sessionIndex);

      try {
        const result =
          message.type === 'chat'
            ? await textCompletions({
                stream: true,
                messages: (
                  (session?.messages.slice(-15).filter((i) => i.content) ?? []) as ChatCompletionRequestMessage[]
                ).concat({
                  role: 'user',
                  content: message.content,
                }),
              })
            : await callAI({
                projectId: message.projectId,
                ref: message.gitRef,
                working: true,
                templateId: message.templateId,
                parameters: message.parameters,
              });

        const reader = result.getReader();
        const decoder = new TextDecoder();

        const isImages = (i: any): i is { type: 'images'; images: { url: string }[] } => i.type === 'images';

        let response = '';

        for (;;) {
          const { value, done } = await reader.read();
          if (value) {
            if (value instanceof Uint8Array) {
              response += decoder.decode(value);
            } else if (typeof value === 'string') {
              response += value;
            } else if (isImages(value)) {
              setMessage(sessionIndex, responseId, (message) => {
                if (!message.loading) return;
                message.images = value.images;
              });
            } else {
              console.error('Unknown AI response type', value);
            }

            setMessage(sessionIndex, responseId, (message) => {
              if (message.cancelled) return;
              message.content = response;
            });
          }

          if (done) {
            break;
          }
        }
        setMessage(sessionIndex, responseId, (message) => {
          if (message.cancelled) return;

          message.done = true;
          message.loading = false;
        });
      } catch (error) {
        setMessage(sessionIndex, responseId, (message) => {
          if (message.cancelled) return;

          message.error = { message: error.message };
          message.loading = false;
        });
      }
    },
    [setMessage, setState, state]
  );

  const cancelMessage = useCallback(
    (sessionIndex: number, messageId: string) => {
      setMessage(sessionIndex, messageId, (message) => {
        message.cancelled = true;
        message.loading = false;
      });
    },
    [setMessage]
  );

  return { state, setSession, setCurrentSession, newSession, deleteSession, sendMessage, cancelMessage };
};
