import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { UndoManager, getYjsDoc } from '@blocklet/co-git/yjs';
import { useThrottleEffect } from 'ahooks';
import equal from 'fast-deep-equal';
import produce, { Draft } from 'immer';
import cloneDeep from 'lodash/cloneDeep';
import debounce from 'lodash/debounce';
import differenceBy from 'lodash/differenceBy';
import intersectionBy from 'lodash/intersectionBy';
import isUndefined from 'lodash/isUndefined';
import omit from 'lodash/omit';
import omitBy from 'lodash/omitBy';
import pick from 'lodash/pick';
import { nanoid } from 'nanoid';
import { ChatCompletionRequestMessage } from 'openai';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';
import { recoilPersist } from 'recoil-persist';

import { Project, TemplateYjs } from '../../../api/src/store/projects';
import { Role } from '../../../api/src/store/templates';
import { callAI, textCompletions } from '../../libs/ai';
import * as branchApi from '../../libs/branch';
import { Commit, getLogs } from '../../libs/log';
import * as projectApi from '../../libs/project';
import { getTemplates } from '../../libs/template';
import { isTemplate, templateYjsFromTemplate, useStore } from './yjs-state';

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
    subMessages?: { content: string; templateId: string; templateName: string }[];
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
    (
      sessionIndex: number,
      messageId: string,
      recipe: (draft: Draft<SessionItem['messages'][number]>) => void,
      checkCancelledStatus?: boolean
    ) => {
      setState((state) =>
        produce(state, (state) => {
          const session = state.sessions.find((i) => i.index === sessionIndex);
          const message = session?.messages.find((i) => i.id === messageId);

          if (checkCancelledStatus) {
            const index = session?.messages.findIndex((i) => i.id === messageId);
            if (index) {
              const nextMessage = session?.messages[index + 1];
              if (nextMessage?.cancelled) return;
            }
          }

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
        const isNext = (i: any): i is { type: 'next'; text: string } => i.type === 'next';

        let response = '';
        const subResponses: { [key: string]: string } = {};

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
            } else if (isNext(value)) {
              if (value.templateId) {
                const key = `${messageId}-${value.templateId}`;
                subResponses[key] = subResponses[key] ?? '';
                subResponses[key] += value.delta;

                setMessage(
                  sessionIndex,
                  messageId,
                  (message) => {
                    if (message.cancelled) return;

                    if (message.subMessages?.length) {
                      const found = message.subMessages.find((x) => x.templateId === value.templateId);
                      if (found) {
                        found.content = subResponses[key] ?? '';
                      } else {
                        message.subMessages = [
                          ...message.subMessages,
                          {
                            content: subResponses[key] ?? '',
                            templateId: value.templateId,
                            templateName: value.templateName,
                          },
                        ];
                      }
                    } else {
                      message.subMessages = [
                        {
                          content: subResponses[key] ?? '',
                          templateId: value.templateId,
                          templateName: value.templateName,
                        },
                      ];
                    }
                  },
                  true
                );
              }
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

type TemplateYjsWithParent = TemplateYjs & { parent: string[] };

export interface TemplatesState {
  created: TemplateYjsWithParent[];
  deleted: TemplateYjsWithParent[];
  modified: TemplateYjsWithParent[];
  createdMap: { [key: string]: TemplateYjs };
  modifiedMap: { [key: string]: TemplateYjs };
  deletedMap: { [key: string]: TemplateYjs };
  disabled: boolean;
  loading: boolean;
  templates: TemplateYjsWithParent[];
  files: TemplateYjsWithParent[];
}

const templatesStates: { [key: string]: RecoilState<TemplatesState> } = {};

const templatesState = (projectId: string, gitRef: string) => {
  const key = `${projectId}-${gitRef}`;

  templatesStates[key] ??= atom<TemplatesState>({
    key: `templatesState-${key}`,
    default: {
      created: [],
      deleted: [],
      modified: [],
      disabled: true,
      createdMap: {},
      modifiedMap: {},
      deletedMap: {},
      loading: false,
      templates: [],
      files: [],
    },
  });

  return templatesStates[key]!;
};

export const useTemplatesChangesState = (projectId: string, ref: string) => {
  const { t } = useLocaleContext();
  const [state, setState] = useRecoilState(templatesState(projectId, ref));

  useUndoManager(projectId, ref);
  const { store, synced } = useStore(projectId, ref);

  useThrottleEffect(
    () => {
      if (state.loading) return;
      if (!synced) return;

      const duplicateItems = intersectionBy(state.templates, state.files, 'id');
      const keys = [
        'id',
        'createdBy',
        'updatedBy',
        'name',
        'description',
        'tags',
        'prompts',
        'parameters',
        'mode',
        'status',
        'public',
        'datasets',
        'next',
        'tests',
        'parent',
      ];

      const news = differenceBy(state.files, state.templates, 'id');
      const deleted = differenceBy(state.templates, state.files, 'id');

      const modified = duplicateItems.filter((i) => {
        const item = omitBy(pick(i, ...keys), (x) => !x);

        const found = state.files.find((f) => item.id === f.id);
        if (!found) {
          return false;
        }

        const file = omitBy(pick(found, ...keys), (x) => !x);
        return !equal(item, file);
      });

      const arrToObj = (list: TemplateYjsWithParent[]) => Object.fromEntries(list.map((i) => [i.id, i]));

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
    [state.templates, state.files, state.loading, synced, projectId, ref],
    { wait: 1000 }
  );

  useEffect(() => {
    const getFile = () => {
      const files = Object.entries(store.tree)
        .map(([key, filepath]) => {
          const template = store.files[key];

          if (filepath?.endsWith('.yaml') && template && isTemplate(template)) {
            const paths = filepath.split('/');
            return { ...template, parent: paths.slice(0, -1) };
          }

          return undefined;
        })
        .filter((i): i is NonNullable<typeof i> => !!i);

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

      const data = await getTemplates(projectId, ref);
      const templates = (data?.templates || []).map((i) =>
        omit(omitBy(templateYjsFromTemplate(i), isUndefined), 'ref', 'projectId')
      ) as TemplateYjsWithParent[];

      setState((r) => ({ ...r, templates }));
    } catch (error) {
      console.error(error);
    } finally {
      setState((r) => ({ ...r, loading: false }));
    }
  };

  const changes = (item: TemplateYjs) => {
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

  useEffect(() => {
    if (projectId && ref) {
      run();
    }
  }, [projectId, ref]);

  return { ...state, changes, run };
};

export const useUndoManager = (projectId: string, ref: string) => {
  const { store } = useStore(projectId, ref);

  const doc = useMemo(() => getYjsDoc(store), [store]);

  const undoManager = useMemo(() => new UndoManager([doc.getMap('files'), doc.getMap('tree')], { doc }), [doc]);

  const [state, setState] = useState(() => ({
    canRedo: undoManager.canRedo(),
    canUndo: undoManager.canUndo(),
    redo: () => undoManager.redo(),
    undo: () => undoManager.undo(),
  }));

  useEffect(() => {
    const update = () => {
      setState((state) => ({
        ...state,
        canRedo: undoManager.canRedo(),
        canUndo: undoManager.canUndo(),
      }));
    };

    undoManager.on('stack-item-added', update);
    undoManager.on('stack-item-popped', update);

    return () => {
      undoManager.off('stack-item-added', update);
      undoManager.off('stack-item-popped', update);
    };
  }, [undoManager]);

  return state;
};
