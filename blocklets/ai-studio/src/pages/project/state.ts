import { useCurrentProject } from '@app/contexts/project';
import { AIGNE_RUNTIME_MOUNT_POINT } from '@app/libs/constants';
import { getDefaultBranch } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { SubscriptionError } from '@blocklet/ai-kit/api';
import { runAssistant } from '@blocklet/ai-runtime/api';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import {
  AssistantResponseType,
  AssistantYjs,
  ExecuteBlock,
  ExecutionPhase,
  Role,
  RunAssistantInput,
  RunAssistantLog,
  fileToYjs,
  isAssistant,
} from '@blocklet/ai-runtime/types';
import { getYjsDoc } from '@blocklet/co-git/yjs';
import { useThrottleEffect } from 'ahooks';
import equal from 'fast-deep-equal';
import { Draft, produce } from 'immer';
import localForage from 'localforage';
import { cloneDeep, differenceBy, get, intersectionBy, omitBy } from 'lodash';
import debounce from 'lodash/debounce';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { nanoid } from 'nanoid';
import { useCallback, useEffect } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';
import { joinURL } from 'ufo';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import Project from '../../../api/src/store/models/project';
import { textCompletions } from '../../libs/ai';
import * as branchApi from '../../libs/branch';
import { Commit, getLogs } from '../../libs/log';
import * as projectApi from '../../libs/project';
import { createSession, deleteSession, getSessions } from '../../libs/sesstions';
import * as api from '../../libs/tree';
import { PROMPTS_FOLDER_NAME, useProjectStore } from './yjs-state';

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

  const refetch = useCallback(
    async ({ force }: { force?: boolean } = {}) => {
      let loading: boolean | undefined = false;
      setState((v) => {
        loading = v.loading;
        return { ...v, loading: true };
      });
      if (loading && !force) return;
      try {
        const [project] = await Promise.all([projectApi.getProject(projectId)]);

        // wait for project can be fetched
        const [{ branches }] = await Promise.all([branchApi.getBranches({ projectId })]);

        const simpleMode = project.gitType === 'simple';
        const { commits } = await getLogs({
          projectId,
          ref: simpleMode ? getDefaultBranch() : gitRef,
        });
        // NOTE: 简单模式下最新的记录始终指向 getDefaultBranch()
        if (simpleMode && commits.length) commits[0]!.oid = getDefaultBranch();
        setState((v) => ({ ...v, project, branches, commits, error: undefined }));
      } catch (error) {
        setState((v) => ({ ...v, error }));
        throw error;
      } finally {
        setState((v) => ({ ...v, loading: false }));
      }
    },
    [projectId, gitRef, setState]
  );

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

  const deleteProjectRemote = useCallback(
    async (...args: Parameters<typeof projectApi.deleteProjectRemote>) => {
      await projectApi.deleteProjectRemote(...args);
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

  return {
    state,
    refetch,
    createBranch,
    updateBranch,
    deleteBranch,
    updateProject,
    addRemote,
    deleteProjectRemote,
    push,
    pull,
    sync,
  };
};

export function useCurrentProjectState() {
  const { projectId, projectRef } = useCurrentProject();
  return useProjectState(projectId, projectRef);
}

export type ImageType = { b64Json?: string; url?: string }[];

export type MessageInput = RunAssistantInput & {
  deep: number;
  output?: string;
  logs?: Array<RunAssistantLog>;
  startTime?: number;
  endTime?: number;
  images?: ImageType;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  stop?: boolean;
};

export interface SessionItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: {
    id: string;
    createdAt: string;
    role: Role;
    messages?: {
      responseAs?: ExecuteBlock['respondAs'];
      taskId: string;
      content?: string;
      images?: { url: string }[];
    }[];
    content: string;
    gitRef?: string;
    parameters?: { [key: string]: any };
    images?: ImageType;
    objects?: any[];
    done?: boolean;
    loading?: boolean;
    cancelled?: boolean;
    error?: { message: string; [key: string]: unknown };
    inputMessages?: Array<MessageInput>;
  }[];
  chatType?: 'chat' | 'debug';
  debugForm?: { [key: string]: any };

  name?: string;
  userId?: string;
  projectId: string;
  agentId: string;
}

export interface DebugState {
  projectId: string;
  assistantId: string;
  sessions: SessionItem[];
  currentSessionId?: string;
  loading?: boolean;
  error?: Error;
}

const debugStates: { [key: string]: RecoilState<DebugState> } = {};

const getDebugState = (aid: string, projectId: string, assistantId: string) => {
  const key = `debug-sessions-state-${aid}` as const;

  debugStates[key] ??= atom<DebugState>({
    key,
    default: (async () => {
      try {
        await debugStateMigration;

        const res = await localForage.getItem<string>(key);
        const json: DebugState = typeof res === 'string' ? JSON.parse(res) : res;
        if (json?.projectId === projectId && json?.assistantId === assistantId) {
          return {
            ...json,
            sessions: json.sessions.map((session) => ({
              ...session,
              messages: session.messages.map((i) => omit(i, 'loading')),
              id: session.id ?? nanoid(),
            })),
          };
        }
      } catch (error) {
        console.error('initialize default debug state error', error);
      }

      return {
        projectId,
        assistantId,
        sessions: [],
        currentSessionId: undefined,
        loading: false,
        error: undefined,
      };
    })(),
    effects: [
      (() => {
        const setItem = debounce((k, v) => {
          localForage.setItem(k, v);
        }, 2000);

        const handleBeforeUnload = () => setItem.flush();
        window.addEventListener('beforeunload', handleBeforeUnload);

        return ({ onSet }) => {
          onSet((value) => setItem(key, value));
          return () => window.removeEventListener('beforeunload', handleBeforeUnload);
        };
      })(),
    ],
  });

  return debugStates[key]!;
};

export const useDebugState = ({
  projectId,
  gitRef,
  assistantId,
}: {
  projectId: string;
  gitRef: string;
  assistantId: string;
}) => {
  const aid = stringifyIdentity({ projectId, projectRef: gitRef, agentId: assistantId });
  const debugState = getDebugState(aid, projectId, assistantId);
  const [state, setState] = useRecoilState(debugState);

  const reload = useCallback(
    async (options?: { autoSetCurrentSessionId?: boolean }) => {
      setState((state) => {
        return {
          ...state,
          loading: true,
        };
      });

      try {
        const { sessions } = await getSessions({ aid });

        setState((state) => {
          const found = [...state.sessions, ...sessions].find((i) => i.id === state.currentSessionId);

          return {
            ...state,
            sessions: sessions.map((i) => {
              const found = state.sessions.find((j) => j.id === i.id);
              return found || { ...i, messages: [] };
            }),
            loading: true,
            error: undefined,
            currentSessionId: options?.autoSetCurrentSessionId && !found ? sessions.at(-1)?.id : state.currentSessionId,
          };
        });
      } catch (error) {
        setState((state) => {
          return { ...state, error };
        });

        throw error;
      } finally {
        setState((state) => {
          return { ...state, loading: false };
        });
      }
    },
    [setState]
  );

  const setCurrentSessionId = useCallback(
    (sessionId: string) => {
      setState((state) => ({ ...state, currentSessionId: sessionId }));
    },
    [setState]
  );

  const createNewSession = useCallback(
    async (session?: Partial<SessionItem>) => {
      const result = await createSession({ aid, name: session?.name });

      setState((state) => {
        return {
          ...state,
          sessions: [...state.sessions, { ...session, ...result.created, messages: [] }],
          loading: false,
          error: undefined,
          currentSessionId: result.created.id,
        };
      });

      return result;
    },
    [reload, aid]
  );

  const setSession = useCallback(
    (currentSessionId: string, recipe: (session: Draft<SessionItem>) => void) => {
      setState((state) =>
        produce(state, (state) => {
          const session = state.sessions.find((i) => i.id === currentSessionId);
          if (session) recipe(session);
        })
      );
    },
    [setState]
  );

  const clearCurrentSession = useCallback(() => {
    setState((state) => {
      const sessions = state.sessions.map((session) =>
        session.id === state.currentSessionId
          ? { ...session, messages: [], updatedAt: new Date().toISOString() }
          : session
      );

      return { ...state, sessions };
    });
  }, [setState]);

  const deleteCurrentSession = useCallback(
    async (sessionId: string) => {
      await deleteSession({ sessionId });

      setState((state) => {
        const sessions = state.sessions.filter((i) => i.id !== sessionId);

        return {
          ...state,
          sessions,
          currentSessionId: state.currentSessionId === sessionId ? sessions.at(-1)?.id : state.currentSessionId,
        };
      });

      await reload({ autoSetCurrentSessionId: true });
    },
    [reload, setState]
  );

  const newSession = useCallback(
    async (session?: Partial<SessionItem>) => {
      try {
        const result = await createNewSession(session);
        setCurrentSessionId(result.created.id);
      } catch (error) {
        Toast.error(error.message);
      }
    },
    [createNewSession, setCurrentSessionId]
  );

  const setMessage = useCallback(
    (currentSessionId: string, messageId: string, recipe: (draft: Draft<SessionItem['messages'][number]>) => void) => {
      requestAnimationFrame(() => {
        setState((state) =>
          produce(state, (state) => {
            const session = state.sessions.find((i) => i.id === currentSessionId);
            const message = session?.messages.findLast((i) => i.id === messageId);

            if (message) recipe(message);
            else console.error(`setMessage: message not found ${currentSessionId} ${messageId}`);
          })
        );
      });
    },
    [setState]
  );

  const sendMessage = useCallback(
    async ({
      currentSessionId,
      message,
    }: {
      currentSessionId: string;
      message:
        | {
            type: 'chat';
            content: string;
            model?: string;
            temperature?: number;
            topP?: number;
            presencePenalty?: number;
            frequencyPenalty?: number;
          }
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
          const session = state.sessions.find((i) => i.id === currentSessionId);
          session?.messages.push(
            {
              id: messageId,
              createdAt: now.toISOString(),
              role: 'user',
              content: message.type === 'chat' ? message.content : '',
              gitRef: message.type === 'debug' ? message.gitRef : undefined,
              parameters: message.type === 'debug' ? message.parameters : undefined,
              inputMessages: [],
              loading: false,
            },
            { id: responseId, createdAt: now.toISOString(), role: 'assistant', content: '', loading: true }
          );
        })
      );

      const session = state.sessions.find((i) => i.id === currentSessionId);
      if (!session?.id) {
        const result = await createNewSession();
        setCurrentSessionId(result.created.id);
        currentSessionId = result.created.id;
      }

      try {
        const result =
          message.type === 'chat'
            ? await textCompletions({
                stream: true,
                messages: (session?.messages || [])
                  .slice(-15)
                  .map((i) => pick(i, 'role', 'content'))
                  .concat({ role: 'user', content: message.content }),
                ...pick(message, 'model', 'temperature', 'topP', 'presencePenalty', 'frequencyPenalty'),
              })
            : await runAssistant({
                url: joinURL(AIGNE_RUNTIME_MOUNT_POINT, '/api/ai/call'),
                working: true,
                aid: stringifyIdentity({
                  projectId: message.projectId,
                  projectRef: message.gitRef,
                  agentId: message.assistantId,
                }),
                sessionId: session?.id,
                inputs: message.parameters,
                debug: true,
              });

        const reader = result.getReader();
        const decoder = new TextDecoder();

        let response = '';
        const messages: SessionItem['messages'][number]['messages'] = [];
        const messageMap: { [key: string]: (typeof messages)[number] } = {};
        let mainTaskId: string | undefined;

        for (;;) {
          const { value, done } = await reader.read();
          if (value) {
            if (value instanceof Uint8Array) {
              response += decoder.decode(value);
            } else if (typeof value === 'string') {
              response += value;
            } else if (value.type === AssistantResponseType.INPUT_PARAMETER) {
              setMessage(currentSessionId, messageId, (message) => {
                message.content = value.delta.content || '';
                message.loading = false;
              });
            } else if (value.type === AssistantResponseType.INPUT) {
              setMessage(currentSessionId, responseId, (message) => {
                message.inputMessages ??= [];

                let lastInput = message.inputMessages.findLast((input) => input.taskId === value.taskId);
                if (lastInput) {
                  lastInput = Object.assign(lastInput, value);
                } else {
                  const parentTrace = message?.inputMessages.findLast((i) => i.taskId === value.parentTaskId);
                  message.inputMessages.push({ ...value, deep: parentTrace ? (parentTrace?.deep || 0) + 1 : 0 });
                }
              });
            } else if (value.type === AssistantResponseType.CHUNK) {
              const { images } = value.delta;

              if (!mainTaskId) mainTaskId = value.taskId;

              if (value.taskId === mainTaskId) {
                response += value.delta.content || '';

                if (value.delta.object) {
                  setMessage(currentSessionId, responseId, (message) => {
                    if (message.cancelled) return;
                    message.objects ??= [];
                    message.objects.push(value.delta.object);
                  });
                }

                if (images?.length) {
                  setMessage(currentSessionId, responseId, (message) => {
                    if (message.cancelled) return;
                    message.images ??= [];
                    message.images.push(...images);
                  });
                }
              } else {
                if (value.respondAs && value.respondAs !== 'none') {
                  let msg = messageMap[value.taskId];
                  if (!msg) {
                    msg = { taskId: value.taskId, responseAs: value.respondAs };
                    messageMap[value.taskId] = msg;
                    messages.push(msg);
                  }

                  msg.content = (msg.content || '') + (value.delta.content || '');
                  if (value.delta.images?.length) msg.images = (msg.images || []).concat(value.delta.images);

                  setMessage(currentSessionId, responseId, (message) => {
                    if (message.cancelled) return;
                    message.messages = JSON.parse(JSON.stringify(messages));
                  });
                }

                setMessage(currentSessionId, responseId, (message) => {
                  if (message.cancelled) return;

                  const lastInput = message.inputMessages?.findLast((input) => input.taskId === value.taskId);
                  if (lastInput) {
                    lastInput.output ??= '';
                    lastInput.output += value.delta.content || '';
                    if (images?.length) {
                      lastInput.images ??= [];
                      lastInput.images.push(...images);
                    }
                  }
                });
              }
            } else if (value.type === AssistantResponseType.EXECUTE) {
              setMessage(currentSessionId, responseId, (message) => {
                message.inputMessages ??= [];

                const lastInput = message.inputMessages?.findLast((input) => input.taskId === value.taskId);
                if (value.execution.currentPhase === ExecutionPhase.EXECUTE_ASSISTANT_START) {
                  if (!lastInput) {
                    const parentTrace = message?.inputMessages.findLast((i) => i.taskId === value.parentTaskId);
                    message.inputMessages.push({
                      type: AssistantResponseType.INPUT,
                      assistantId: value.assistantId,
                      assistantName: value.assistantName!,
                      taskId: value.taskId,
                      parentTaskId: value.parentTaskId,
                      startTime: Date.now(),
                      deep: parentTrace ? (parentTrace?.deep || 0) + 1 : 0,
                    });
                  }
                } else if (value.execution.currentPhase === ExecutionPhase.EXECUTE_ASSISTANT_END) {
                  if (lastInput) {
                    lastInput.endTime = Date.now();
                  }
                } else if (value.execution.currentPhase === ExecutionPhase.EXECUTE_SELECT_STOP) {
                  if (lastInput) {
                    lastInput.endTime = Date.now();
                    lastInput.stop = true;
                  }
                }
              });
            } else if (value.type === AssistantResponseType.USAGE) {
              setMessage(currentSessionId, responseId, (message) => {
                if (message.cancelled) return;
                const lastInput = message.inputMessages?.findLast((input) => input.taskId === value.taskId);
                if (lastInput) lastInput.usage = value.usage;
              });
            } else if (value.type === AssistantResponseType.ERROR) {
              setMessage(currentSessionId, responseId, (message) => {
                if (message.cancelled) return;
                message.error = pick(value.error, 'message', 'type', 'timestamp') as {
                  message: string;
                  [key: string]: unknown;
                };
              });
            } else if (value.type === AssistantResponseType.LOG) {
              setMessage(currentSessionId, responseId, (message) => {
                if (message.cancelled) return;
                const lastInput = message.inputMessages?.findLast((input) => input.taskId === value.taskId);
                if (lastInput) {
                  lastInput.logs ??= [];
                  lastInput.logs.push(value);
                }
              });
            } else {
              console.error('Unknown AI response type', value);
            }

            setMessage(currentSessionId, responseId, (message) => {
              if (message.cancelled) return;
              message.content = response;
            });
          }

          if (done) {
            break;
          }
        }

        setMessage(currentSessionId, responseId, (message) => {
          if (message.cancelled) return;

          message.done = true;
          message.loading = false;
        });
      } catch (error) {
        setMessage(currentSessionId, responseId, (message) => {
          if (message.cancelled) return;
          if (error instanceof SubscriptionError) {
            message.error = { message: error.message, type: error.type, timestamp: error.timestamp };
          } else {
            message.error = { message: error.message };
          }
          message.loading = false;
        });
      } finally {
        setMessage(currentSessionId, responseId, (message) => {
          message.loading = false;
        });
      }
    },
    [setMessage, setState, state.sessions]
  );

  const cancelMessage = useCallback(
    (currentSessionId: string, messageId: string) => {
      setMessage(currentSessionId, messageId, (message) => {
        message.cancelled = true;
        message.loading = false;
      });
    },
    [setMessage]
  );

  return {
    state,
    sendMessage,
    cancelMessage,

    reload,
    setSession,
    newSession,
    setCurrentSessionId,
    deleteCurrentSession,
    clearCurrentSession,
  };
};

async function migrateDebugStateFroMLocalStorageToIndexedDB() {
  const debugStateKeys = Object.keys(localStorage).filter((key) => key.startsWith('debugState-'));

  for (const key of debugStateKeys) {
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

export type AssistantYjsWithParents = AssistantYjs & { parent: string[] };

export interface AssistantState {
  created: AssistantYjsWithParents[];
  deleted: AssistantYjsWithParents[];
  modified: AssistantYjsWithParents[];
  createdMap: { [key: string]: AssistantYjsWithParents };
  modifiedMap: { [key: string]: AssistantYjsWithParents };
  deletedMap: { [key: string]: AssistantYjsWithParents };
  disabled: boolean;
  loading: boolean;
  assistants: AssistantYjsWithParents[];
  files: AssistantYjsWithParents[];
}

const assistantStates: { [key: string]: RecoilState<AssistantState> } = {};

const assistantState = (projectId: string, gitRef: string) => {
  const key = `${projectId}-${gitRef}`;

  assistantStates[key] ??= atom<AssistantState>({
    key: `assistantState-${key}`,
    default: {
      created: [],
      deleted: [],
      modified: [],
      disabled: true,
      createdMap: {},
      modifiedMap: {},
      deletedMap: {},
      loading: false,
      assistants: [],
      files: [],
    },
  });

  return assistantStates[key]!;
};

export const useAssistantChangesState = (projectId: string, ref: string) => {
  const { t } = useLocaleContext();
  const [state, setState] = useRecoilState(assistantState(projectId, ref));

  const { store, synced } = useProjectStore(projectId, ref);

  useThrottleEffect(
    () => {
      if (state.loading) return;
      if (!synced) return;

      const duplicateItems = intersectionBy(state.assistants, state.files, 'id');
      const news = differenceBy(state.files, state.assistants, 'id');
      const deleted = differenceBy(state.assistants, state.files, 'id');
      const modified = duplicateItems.filter((i) => {
        const item = omit(
          omitBy(i, (x) => !x),
          'tests',
          'createdBy',
          'updatedBy',
          'updatedAt',
          'createdAt'
        );

        const found = state.files.find((f) => item.id === f.id);
        if (!found) {
          return false;
        }

        const file = omit(
          omitBy(found, (x) => !x),
          'tests',
          'createdBy',
          'updatedBy',
          'updatedAt',
          'createdAt'
        );
        return !equal(item, file);
      });

      const arrToObj = (list: AssistantYjsWithParents[]) => Object.fromEntries(list.map((i) => [i.id, i]));

      setState((v) => ({
        ...v,
        created: news,
        deleted,
        modified,
        disabled: news.length + deleted.length + modified.length === 0,
        createdMap: arrToObj(news),
        modifiedMap: arrToObj(modified),
        deletedMap: arrToObj(deleted),
      }));
    },
    [state.assistants, state.files, state.loading, synced, projectId, ref],
    { wait: 1000 }
  );

  useEffect(() => {
    const getFile = () => {
      const files = Object.entries(store.tree)
        .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
        .map(([id, filepath]) => {
          const file = store.files[id] as AssistantYjsWithParents;

          if (file) {
            return { ...file, parent: (filepath?.split('/') || []).slice(0, -1) };
          }

          return file;
        })
        .filter((x) => x !== null)
        .filter((i): i is AssistantYjsWithParents => !!i && isAssistant(i));

      setState((r) => ({ ...r, files: cloneDeep(files) }));
    };

    getFile();

    getYjsDoc(store).getMap('files').observeDeep(getFile);
    getYjsDoc(store).getMap('tree').observeDeep(getFile);

    return () => {
      getYjsDoc(store).getMap('files').unobserveDeep(getFile);
      getYjsDoc(store).getMap('tree').unobserveDeep(getFile);
    };
  }, [projectId, ref]);

  const run = async () => {
    try {
      setState((r) => ({ ...r, loading: true }));

      const [{ files }] = await Promise.all([api.getTree({ projectId, ref })]);
      const assistants = files
        .filter((x) => typeof x === 'object' && x.parent[0] === PROMPTS_FOLDER_NAME)
        .map((x) => {
          if (x && x.type === 'file') {
            const file = fileToYjs(x.meta) as AssistantYjsWithParents;
            return { ...file, parent: x.parent };
          }

          return null;
        })
        .filter((x) => x !== null)
        .filter((i): i is AssistantYjsWithParents => !!i && isAssistant(i));

      setState((r) => ({ ...r, assistants }));
    } catch (error) {
      console.error(error);
    } finally {
      setState((r) => ({ ...r, loading: false }));
    }
  };

  const changes = (item: AssistantYjs) => {
    if (state.createdMap[item.id]) {
      return {
        key: 'N',
        color: 'success.main',
        tips: t('diff.created'),
      };
    }

    if (state.modifiedMap[item.id]) {
      return {
        key: 'M',
        color: 'warning.main',
        tips: t('diff.modified'),
      };
    }

    if (state.deletedMap[item.id]) {
      return {
        key: 'D',
        color: 'error.main',
        tips: t('diff.deleted'),
      };
    }

    return null;
  };

  const getOriginTemplate = (item: AssistantYjs) => {
    return state.assistants.find((x) => x.id === item.id);
  };

  useEffect(() => {
    if (projectId && ref) run();
  }, [projectId, ref]);

  return { ...state, changes, run, getOriginTemplate };
};

export function useAssistantCompare({
  value,
  compareValue,
  isRemoteCompare,
}: {
  value: AssistantYjs;
  compareValue?: AssistantYjs;
  readOnly?: boolean;
  isRemoteCompare?: boolean;
}) {
  const getDiffName = useCallback(
    (path: keyof AssistantYjs, id?: string, defaultValue?: string) => {
      if (!compareValue) return '';

      const key = (id ? [path, id] : [path]).join('.');

      const isDifferent = (() => {
        const compareItem = JSON.stringify(get(compareValue, key, defaultValue ?? ''));
        const currentItem = JSON.stringify(get(value, key, defaultValue ?? ''));
        return !equal(compareItem, currentItem);
      })();

      if (!isDifferent) return '';

      if (id === undefined) {
        return isDifferent ? 'modify' : '';
      }

      const itemExistsInCompareValue = get(compareValue, key);
      if (itemExistsInCompareValue === undefined) return isRemoteCompare ? 'delete' : 'new';

      return 'modify';
    },
    [compareValue, value, isRemoteCompare]
  );

  const getBackgroundColor = (name: string) => {
    switch (name) {
      case 'new':
        return 'rgba(230, 255, 236, 0.4) !important';
      case 'delete':
        return 'rgba(255, 215, 213, 0.4) !important';
      case 'modify':
        return 'rgba(255, 235, 233, 0.4) !important';
      default:
        return '';
    }
  };

  const getDiffStyle = useCallback(
    (style: string, path: keyof AssistantYjs, id?: string, defaultValue?: string) => {
      const diffName = getDiffName(path, id, defaultValue);
      return diffName ? { [style]: getBackgroundColor(diffName) } : {};
    },
    [getDiffName]
  );

  const getDiffBackground = useCallback(
    (path: any, id?: string, defaultValue?: string) => {
      return getDiffStyle('background', path, id, defaultValue);
    },
    [getDiffStyle]
  );

  return { getDiffName, getDiffBackground, getBackgroundColor };
}

export const saveButtonState = create<{
  save?: (options?: {
    skipConfirm?: boolean;
    skipCommitIfNoChanges?: boolean;
  }) => Promise<{ saved?: boolean } | undefined>;
  setSaveHandler: (
    save?: (options?: {
      skipConfirm?: boolean;
      skipCommitIfNoChanges?: boolean;
    }) => Promise<{ saved?: boolean } | undefined>
  ) => void;
}>()(
  immer((set) => ({
    setSaveHandler(save) {
      set((state) => {
        state.save = save;
      });
    },
  }))
);
