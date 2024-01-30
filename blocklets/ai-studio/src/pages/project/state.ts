import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { SubscriptionError } from '@blocklet/ai-kit/api';
import { runAssistant } from '@blocklet/ai-runtime/api';
import {
  AssistantResponseType,
  AssistantYjs,
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
import { useCallback, useEffect, useMemo } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';
import { joinURL } from 'ufo';

import Project from '../../../api/src/store/models/project';
import { textCompletions } from '../../libs/ai';
import { PREFIX } from '../../libs/api';
import * as branchApi from '../../libs/branch';
import { Commit, getLogs } from '../../libs/log';
import * as projectApi from '../../libs/project';
import * as api from '../../libs/tree';
import { PROMPTS_FOLDER_NAME, useProjectStore } from './yjs-state';

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

export type ImageType = { b64Json?: string; url?: string }[];

export type MessageInput = RunAssistantInput & {
  deep: number;
  output?: string;
  logs?: Array<RunAssistantLog>;
  startTime?: number;
  endTime?: number;
  images?: ImageType;
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
    images?: ImageType;
    done?: boolean;
    loading?: boolean;
    cancelled?: boolean;
    error?: { message: string; [key: string]: unknown };
    inputMessages?: Array<MessageInput>;
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
        if (json?.projectId === projectId && json?.assistantId === assistantId) {
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

const useDebugInitState = (projectId: string, assistantId: string) => {
  const [key, initialState] = useMemo(() => getInitialDebugState(projectId, assistantId), [projectId, assistantId]);

  debugStates[key] ??= atom<DebugState>({
    key,
    default: initialState,
    effects: [
      (() => {
        const setItem = debounce((k, v) => {
          localForage.setItem(k, v);
        }, 2000);

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
  const debugState = useDebugInitState(projectId, assistantId);
  const [state, setState] = useRecoilState(debugState);

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

  const clearCurrentSession = useCallback(() => {
    setState((state) => {
      const sessions = state.sessions.map((session) =>
        session.index === state.currentSessionIndex
          ? { ...session, messages: [], updatedAt: new Date().toISOString() }
          : session
      );
      return {
        ...state,
        sessions,
      };
    });
  }, [setState]);

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
      requestAnimationFrame(() => {
        setState((state) =>
          produce(state, (state) => {
            const session = state.sessions.find((i) => i.index === sessionIndex);
            const message = session?.messages.findLast((i) => i.id === messageId);

            if (message) recipe(message);
            else console.error(`setMessage: message not found ${sessionIndex} ${messageId}`);
          })
        );
      });
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
          const session = state.sessions.find((i) => i.index === sessionIndex);
          session?.messages.push(
            {
              id: messageId,
              createdAt: now.toISOString(),
              role: 'user',
              content: message.type === 'chat' ? message.content : '',
              gitRef: message.type === 'debug' ? message.gitRef : undefined,
              parameters: message.type === 'debug' ? message.parameters : undefined,
              inputMessages: [],
              loading: true,
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
                messages: (session?.messages.slice(-15).map((i) => pick(i, 'role', 'content')) ?? []).concat({
                  role: 'user',
                  content: message.content,
                }),
                ...pick(message, 'model', 'temperature', 'topP', 'presencePenalty', 'frequencyPenalty'),
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
            } else if (value.type === AssistantResponseType.INPUT) {
              setMessage(sessionIndex, messageId, (message) => {
                message.inputMessages ??= [];

                let lastInput = message.inputMessages.findLast((input) => input.taskId === value.taskId);
                if (lastInput) {
                  lastInput = Object.assign(lastInput, value);
                }
              });
            } else if (value.type === AssistantResponseType.CHUNK) {
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
              setMessage(sessionIndex, messageId, (message) => {
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
                }
              });
            } else if (value.type === AssistantResponseType.ERROR) {
              setMessage(sessionIndex, responseId, (message) => {
                if (message.cancelled) return;
                message.error = pick(value.error, 'message', 'type', 'timestamp') as {
                  message: string;
                  [key: string]: unknown;
                };
              });
            } else if (value.type === AssistantResponseType.LOG) {
              setMessage(sessionIndex, messageId, (message) => {
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
          if (error instanceof SubscriptionError) {
            message.error = { message: error.message, type: error.type, timestamp: error.timestamp };
          } else {
            message.error = { message: error.message };
          }
          message.loading = false;
        });
      } finally {
        setMessage(sessionIndex, messageId, (message) => {
          message.loading = false;
        });
      }
    },
    [setMessage, setState, state.sessions]
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

  return {
    state,
    setSession,
    setCurrentSession,
    newSession,
    clearCurrentSession,
    deleteSession,
    sendMessage,
    cancelMessage,
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
