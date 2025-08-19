import { useCurrentProject } from '@app/contexts/project';
import { AIGNE_RUNTIME_MOUNT_POINT } from '@app/libs/constants';
import { getDefaultBranch } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
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
import { SubscriptionError } from '@blocklet/aigne-hub/api';
import { getYjsDoc } from '@blocklet/co-git/yjs';
import { alpha, useTheme } from '@mui/material/styles';
import { useMemoizedFn, useThrottleEffect } from 'ahooks';
import equal from 'fast-deep-equal';
import { Draft, produce } from 'immer';
import { cloneDeep, differenceBy, get, intersectionBy, omitBy } from 'lodash';
import omit from 'lodash/omit';
import pick from 'lodash/pick';
import { nanoid } from 'nanoid';
import { useCallback, useEffect } from 'react';
import usePromise from 'react-promise-suspense';
import { joinURL } from 'ufo';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import Project from '../../../api/src/store/models/project';
import { textCompletions } from '../../libs/ai';
import * as branchApi from '../../libs/branch';
import { Commit, getLogs } from '../../libs/log';
import * as projectApi from '../../libs/project';
import * as api from '../../libs/tree';
import { useAssistantStateStore } from '../../store/assistant-state-store';
import { useDebugStateStore } from '../../store/debug-state-store';
import { useProjectStateStore } from '../../store/project-state-store';
import { PROMPTS_FOLDER_NAME, useProjectStore } from './yjs-state';

export interface ProjectState {
  project?: Project;
  branches: string[];
  commits: Commit[];
  loading?: boolean;
  error?: Error;
}

export const useProjectState = (projectId: string, gitRef: string) => {
  const key = `${projectId}-${gitRef}`;
  const { getState, updateState } = useProjectStateStore();
  const state = getState(key);

  const setState = useMemoizedFn((updater: (state: ProjectState) => ProjectState) => updateState(key, updater));

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
        setState((v) => ({ ...v, project, branches, commits, error: undefined }));
      } catch (error) {
        setState((v) => ({ ...v, error: error as Error }));
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
  index: number;
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
  sessionId: string;
}

export interface DebugState {
  projectId: string;
  assistantId: string;
  sessions: SessionItem[];
  nextSessionIndex: number;
  currentSessionIndex?: number;
}

export const useDebugState = ({ projectId, assistantId }: { projectId: string; assistantId: string }) => {
  const key = `debugState-${projectId}-${assistantId}`;
  const { getState, updateState, getOrCreateState } = useDebugStateStore();

  usePromise(getOrCreateState, [key, projectId, assistantId]);
  const state = getState(key);

  const setState = useMemoizedFn((updater: (state: DebugState) => DebugState) => updateState(key, updater));

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
              sessionId: nanoid(),
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
          ? { ...session, sessionId: nanoid(), messages: [], updatedAt: new Date().toISOString() }
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
              loading: false,
            },
            { id: responseId, createdAt: now.toISOString(), role: 'assistant', content: '', loading: true }
          );
        })
      );

      const session = state.sessions.find((i) => i.index === sessionIndex);
      if (!session) throw new Error('session does not exist');

      try {
        const result =
          message.type === 'chat'
            ? await textCompletions({
                stream: true,
                messages: session.messages
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
                sessionId: session.sessionId,
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
              setMessage(sessionIndex, messageId, (message) => {
                message.content = value.delta.content || '';
                message.loading = false;
              });
            } else if (value.type === AssistantResponseType.INPUT) {
              setMessage(sessionIndex, responseId, (message) => {
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
                  setMessage(sessionIndex, responseId, (message) => {
                    if (message.cancelled) return;
                    message.objects ??= [];
                    message.objects.push(value.delta.object);
                  });
                }

                if (images?.length) {
                  setMessage(sessionIndex, responseId, (message) => {
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

                  setMessage(sessionIndex, responseId, (message) => {
                    if (message.cancelled) return;
                    message.messages = JSON.parse(JSON.stringify(messages));
                  });
                }

                setMessage(sessionIndex, responseId, (message) => {
                  if (message.cancelled) return;

                  const lastInput = message.inputMessages?.findLast((input) => input.taskId === value.taskId);
                  if (lastInput) {
                    if (value.delta.content) {
                      lastInput.output ??= '';
                      lastInput.output += value.delta.content || '';
                    }
                    if (value.delta.object) {
                      lastInput.output = JSON.stringify(value.delta.object, null, 2);
                    }
                    if (images?.length) {
                      lastInput.images ??= [];
                      lastInput.images.push(...images);
                    }
                  }
                });
              }
            } else if (value.type === AssistantResponseType.EXECUTE) {
              setMessage(sessionIndex, responseId, (message) => {
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
              setMessage(sessionIndex, responseId, (message) => {
                if (message.cancelled) return;
                const lastInput = message.inputMessages?.findLast((input) => input.taskId === value.taskId);
                if (lastInput) lastInput.usage = value.usage;
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
              setMessage(sessionIndex, responseId, (message) => {
                if (message.cancelled) return;
                const lastInput = message.inputMessages?.findLast((input) => input.taskId === value.taskId);
                if (lastInput) {
                  lastInput.logs ??= [];
                  lastInput.logs.push(value);
                }
              });
            } else if (value.type === AssistantResponseType.PROGRESS) {
              // @ts-ignore
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
        setMessage(sessionIndex, responseId, (message) => {
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

export const useAssistantChangesState = (projectId: string, ref: string) => {
  const { t } = useLocaleContext();
  const key = `assistantState-${projectId}-${ref}`;
  const { getState, updateState } = useAssistantStateStore();
  const state = getState(key);

  const setState = useMemoizedFn((updater: (state: AssistantState) => AssistantState) => updateState(key, updater));

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
  const theme = useTheme();
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

  const getBackgroundColor = useCallback(
    (name: string) => {
      switch (name) {
        case 'new':
          return alpha(theme.palette.success.main, 0.1);
        case 'delete':
          return alpha(theme.palette.error.main, 0.1);
        case 'modify':
          return alpha(theme.palette.warning.main, 0.1);
        default:
          return '';
      }
    },
    [theme]
  );

  const getDiffStyle = useCallback(
    (style: string, path: keyof AssistantYjs, id?: string, defaultValue?: string) => {
      const diffName = getDiffName(path, id, defaultValue);
      return diffName ? { [style]: getBackgroundColor(diffName) } : {};
    },
    [getDiffName, theme]
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
