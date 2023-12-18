import { isRunAssistantChunk, isRunAssistantError, runAssistant } from '@blocklet/ai-runtime/api';
import { Role } from '@blocklet/ai-runtime/types';
import produce, { Draft } from 'immer';
import localForage from 'localforage';
import debounce from 'lodash/debounce';
import omit from 'lodash/omit';
import { nanoid } from 'nanoid';
import { ChatCompletionRequestMessage } from 'openai';
import { useCallback } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';
import { joinURL } from 'ufo';

import Project from '../../../api/src/store/models/project';
import { textCompletions } from '../../libs/ai';
import { PREFIX } from '../../libs/api';
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
      const simpleMode = project.gitType === 'simple';
      const { commits } = await getLogs({ projectId, ref: simpleMode ? defaultBranch : gitRef });
      // NOTE: 简单模式下最新的记录始终指向 defaultBranch
      if (simpleMode && commits.length) commits[0]!.oid = defaultBranch;
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
    [refetch]
  );

  const addRemote = useCallback(
    async (...args: Parameters<typeof projectApi.addProjectRemote>) => {
      await projectApi.addProjectRemote(...args);
      refetch();
    },
    [refetch]
  );

  const push = useCallback(
    async (...args: Parameters<typeof projectApi.projectPush>) => {
      await projectApi.projectPush(...args);
      refetch();
    },
    [refetch]
  );

  const pull = useCallback(
    async (...args: Parameters<typeof projectApi.projectPull>) => {
      await projectApi.projectPull(...args);
      refetch();
    },
    [refetch]
  );

  const sync = useCallback(
    async (...args: Parameters<typeof projectApi.projectSync>) => {
      await projectApi.projectSync(...args);
      refetch();
    },
    [refetch]
  );

  return { state, refetch, createBranch, updateBranch, deleteBranch, updateProject, addRemote, push, pull, sync };
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
    images?: { b64Json?: string; url?: string }[];
    done?: boolean;
    loading?: boolean;
    cancelled?: boolean;
    error?: { message: string };
    subMessages?: {
      taskId: string;
      assistantId: string;
      content: string;
      images?: { b64Json?: string; url?: string }[];
    }[];
  }[];
  chatType?: 'chat' | 'debug';
  debugForm?: { [key: string]: any };
}

export interface DebugState {
  projectId: string;
  assistantId: string;
  sessions: SessionItem[];
  nextSessionIndex: number;
  currentSessionIndex?: number;
}

const debugStates: { [key: string]: RecoilState<DebugState> } = {};

const getInitialDebugState = (projectId: string, assistantId: string): [string, Promise<DebugState>] => {
  const key = `debugState-${projectId}-${assistantId}` as const;
  const now = new Date().toISOString();

  return [
    key,
    (async () => {
      try {
        await debugStateMigration;

        const res = await localForage.getItem<string>(key);
        const json: DebugState = typeof res === 'string' ? JSON.parse(res) : res;
        if (json.projectId === projectId && json.assistantId === assistantId) {
          return {
            ...json,
            sessions: json.sessions.map((session) => ({
              ...session,
              messages: session.messages.map((i) => omit(i, 'loading')),
            })),
          };
        }
      } catch (error) {
        console.error('initialize default debug state error', error);
      }
      return {
        projectId,
        assistantId,
        sessions: [{ index: 1, createdAt: now, updatedAt: now, messages: [], chatType: 'debug' }],
        nextSessionIndex: 2,
      };
    })(),
  ];
};

const debugState = (projectId: string, assistantId: string) => {
  const [key, initialState] = getInitialDebugState(projectId, assistantId);

  debugStates[key] ??= atom<DebugState>({
    key,
    default: initialState,
    effects: [
      (() => {
        const setItem = debounce((k, v) => {
          localForage.setItem(k, v);
        }, 1000);

        window.addEventListener('beforeunload', () => setItem.flush());

        return ({ onSet }) => {
          onSet((value) => setItem(key, value));
        };
      })(),
    ],
  });

  return debugStates[key]!;
};

export const useDebugState = ({ projectId, assistantId }: { projectId: string; assistantId: string }) => {
  const [state, setState] = useRecoilState(debugState(projectId, assistantId));

  const newSession = useCallback(
    (session?: Partial<SessionItem>) => {
      setState((state) => {
        const currentSession = state.sessions.find((i) => i.index === state.currentSessionIndex);

        const now = new Date().toISOString();
        const index = state.nextSessionIndex;

        return {
          ...state,
          sessions: [
            ...state.sessions,
            {
              ...session,
              index,
              createdAt: now,
              updatedAt: now,
              messages: [],
              chatType: currentSession?.chatType,
            },
          ],
          nextSessionIndex: index + 1,
          currentSessionIndex: index,
        };
      });
    },
    [setState]
  );

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
          const message = session?.messages.findLast((i) => i.id === messageId);

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
            assistantId: string;
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
              subMessages: [],
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
            : await runAssistant({
                url: joinURL(PREFIX, '/api/ai/call'),
                projectId: message.projectId,
                ref: message.gitRef,
                working: true,
                assistantId: message.assistantId,
                parameters: message.parameters,
              });

        const reader = result.getReader();
        const decoder = new TextDecoder();

        let response = '';
        let mainTaskId: string | undefined;

        for (;;) {
          const { value, done } = await reader.read();
          if (value) {
            if (value instanceof Uint8Array) {
              response += decoder.decode(value);
            } else if (typeof value === 'string') {
              response += value;
            } else if (isRunAssistantChunk(value)) {
              const { images } = value.delta;

              if (!mainTaskId) mainTaskId = value.taskId;

              if (value.taskId === mainTaskId) {
                response += value.delta.content || '';

                if (images?.length) {
                  setMessage(sessionIndex, responseId, (message) => {
                    if (message.cancelled) return;
                    message.images ??= [];
                    message.images.push(...images);
                  });
                }
              } else {
                setMessage(sessionIndex, messageId, (message) => {
                  if (message.cancelled) return;

                  message.subMessages ??= [];

                  let subMessage = message.subMessages.findLast((i) => i.taskId === value.taskId);
                  if (!subMessage) {
                    subMessage = { taskId: value.taskId, assistantId: value.assistantId, content: '' };
                    message.subMessages.push(subMessage);
                  }

                  subMessage.content += value.delta.content || '';

                  if (images?.length) {
                    subMessage.images ??= [];
                    subMessage.images.push(...images);
                  }
                });
              }
            } else if (isRunAssistantError(value)) {
              setMessage(sessionIndex, responseId, (message) => {
                if (message.cancelled) return;
                message.error = value.error;
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

async function migrateDebugStateFroMLocalStorageToIndexedDB() {
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith('debugState-')) {
      const text = localStorage.getItem(key);
      localStorage.removeItem(key);

      try {
        const json = JSON.parse(text!);
        const state = json[key];
        if (typeof state.projectId === 'string' && typeof state.templateId === 'string') {
          await localForage.setItem(key, {
            assistantId: state.templateId,
            ...omit(state, 'templateId'),
          });
        }

        console.warn('migrate debug state from localStorage to indexed db success', key);
      } catch (error) {
        console.error('migrate debug state from localStorage to indexed db error', key, error);
      }
    }
  }
}

const debugStateMigration = migrateDebugStateFroMLocalStorageToIndexedDB();
