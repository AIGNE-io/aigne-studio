import { useCurrentProject } from '@app/contexts/project';
import { useSessionContext } from '@app/contexts/session';
import {
  Assistant,
  AssistantYjs,
  ConfigFileYjs,
  CronFileYjs,
  FileTypeYjs,
  MemoryFileYjs,
  ProjectSettings,
  isApiAssistant,
  isAssistant,
  isFunctionAssistant,
  isImageAssistant,
  isPromptAssistant,
  nextAssistantId,
} from '@blocklet/ai-runtime/types';
import {
  Doc,
  Map,
  UndoManager,
  createEncoder,
  getYjsDoc,
  syncedStore,
  toUint8Array,
  useSyncedStore,
  writeVarUint,
} from '@blocklet/co-git/yjs';
import Cookies from 'js-cookie';
import cloneDeep from 'lodash/cloneDeep';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import { customAlphabet, nanoid } from 'nanoid';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';
import { joinURL } from 'ufo';
import { IndexeddbPersistence } from 'y-indexeddb';
import { writeSyncStep1 } from 'y-protocols/sync';
import { WebsocketProvider, messageSync } from 'y-websocket';

import { PREFIX } from '../../libs/api';

export const PROMPTS_FOLDER_NAME = 'prompts';

const VARIABLE_FILE_PATH = 'config/variable.yaml';
const CONFIG_FILE_PATH = 'config/config.yaml';
const CRON_CONFIG_FILE_PATH = 'config/cron.yaml';
const PROJECT_FILE_PATH = 'project.yaml';

export const isBuiltinFolder = (folder: string) => [PROMPTS_FOLDER_NAME].includes(folder);

export type State = {
  files: { [key: string]: FileTypeYjs };
  tree: { [key: string]: string };
};

export interface StoreContext {
  synced: boolean;
  store: ReturnType<typeof syncedStore<State>>;
  awareness: {
    clients: {
      [key: number]: { avatar?: string; did: string; fullName: string };
    };
    files: {
      [key: string]: {
        clients: { clientId: number }[];

        fields: {
          [key: string]: {
            clients: { clientId: number }[];
          };
        };
      };
    };
  };
  provider: WebsocketProvider;
  indexeddb: IndexeddbPersistence;
}

const stores: Record<string, RecoilState<StoreContext>> = {};

const projectStore = (projectId: string, gitRef: string) => {
  const key = `projectStore-${projectId}-${gitRef}`;
  stores[key] ??= atom<StoreContext>({
    key,
    dangerouslyAllowMutability: true,
    default: (() => {
      const url = (() => {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = new URL(`${wsProtocol}://${window.location.host}`);
        wsUrl.pathname = joinURL(PREFIX, 'api/ws', projectId);
        return wsUrl.toString();
      })();

      const doc = new Doc();

      const provider = new WebsocketProvider(url, gitRef, doc, {
        connect: false,
        params: { token: Cookies.get('login_token')! },
      });

      const store = syncedStore<State>({ files: {}, tree: {} }, doc);

      const indexeddb = new IndexeddbPersistence(`${projectId}-${gitRef}`, doc);

      return {
        store,
        awareness: { clients: {}, files: {} },
        provider,
        synced: provider.synced,
        indexeddb,
      };
    })(),
  });
  return stores[key]!;
};

export const useWebSocketStatus = (projectId: string, gitRef: string) => {
  const [status, setStatus] = useState<'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED'>('CONNECTING');
  const { provider } = useProjectStore(projectId, gitRef, true);

  useEffect(() => {
    if (!provider) return undefined;

    const updateStatus = () => {
      switch (provider.ws?.readyState) {
        case WebSocket.CONNECTING:
          setStatus('CONNECTING');
          break;
        case WebSocket.OPEN:
          setStatus('OPEN');
          break;
        case WebSocket.CLOSING:
          setStatus('CLOSING');
          break;
        case WebSocket.CLOSED:
          setStatus('CLOSED');
          break;
        default:
          setStatus('CLOSED');
          break;
      }
    };

    provider.ws?.addEventListener('open', updateStatus);
    provider.ws?.addEventListener('close', updateStatus);
    provider.ws?.addEventListener('error', updateStatus);
    // const interval = window.setInterval(updateStatus, 1000);

    return () => {
      provider.ws?.removeEventListener('open', updateStatus);
      provider.ws?.removeEventListener('close', updateStatus);
      provider.ws?.removeEventListener('error', updateStatus);
      // clearInterval(interval);
    };
  }, [provider, projectId, gitRef]);

  return status;
};

export const useProjectStore = (projectId: string, gitRef: string, connect?: boolean) => {
  const [store, setStore] = useRecoilState(projectStore(projectId, gitRef));

  useEffect(() => {
    if (!connect) return undefined;

    const { provider } = store;

    // NOTE: 修复第一次连接时由于 server 端初始化 state 耗时导致没有同步成功的问题
    const interval = window.setInterval(() => {
      if (provider.ws && provider.ws.readyState === WebSocket.OPEN) {
        const encoder = createEncoder();
        writeVarUint(encoder, messageSync);
        writeSyncStep1(encoder, provider.doc);
        provider.ws.send(toUint8Array(encoder));
      }
    }, 1000);

    const onSynced = () => {
      setStore((v) => ({ ...v, synced: true }));
      clearInterval(interval);
    };

    const onAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const awareness: StoreContext['awareness'] = {
        clients: {},
        files: {},
      };

      for (const [clientId, state] of states.entries()) {
        if (clientId === provider.awareness.clientID) continue;
        awareness.clients[clientId] = pick(state?.focus?.user, 'did', 'fullName', 'avatar');

        const path: (string | number)[] = state?.focus?.path;
        if (path && path.length >= 1) {
          const file = path[0]!;

          awareness.files[file] ??= { clients: [], fields: {} };
          awareness.files[file]!.clients.push({ clientId });

          if (path.length >= 2) {
            const field = path.slice(1).join('.');
            awareness.files[file]!.fields[field] ??= { clients: [] };
            awareness.files[file]!.fields[field]!.clients.push({ clientId });
          }
        }
      }

      setStore((v) => {
        return { ...v, awareness };
      });
    };

    provider.on('synced', onSynced);
    provider.awareness.on('change', onAwarenessChange);
    provider.connect();

    return () => {
      clearInterval(interval);
      provider.disconnect();
      provider.off('synced', onSynced);
      provider.awareness.off('change', onAwarenessChange);
    };
  }, [projectId, gitRef]);

  const syncedStore = useSyncedStore(store.store, [store.store]);

  const config = proxyConfigFile<ConfigFileYjs>(syncedStore, CONFIG_FILE_PATH);
  const cronConfig = proxyConfigFile<CronFileYjs>(syncedStore, CRON_CONFIG_FILE_PATH);
  const projectSetting = proxyConfigFile<ProjectSettings>(syncedStore, PROJECT_FILE_PATH);

  return {
    ...store,
    store: syncedStore,
    config,
    cronConfig,
    projectSetting,
    getTemplateById: useCallback(
      (templateId: string) => {
        const file = syncedStore.files[templateId];
        return file && isPromptAssistant(file) ? file : undefined;
      },
      [syncedStore.files]
    ),
    getFileById: useCallback(
      (fileId: string) => {
        const file = syncedStore.files[fileId];
        return file && isAssistant(file) ? file : undefined;
      },
      [syncedStore.files]
    ),
    getVariables: useCallback(() => {
      const file = syncedStore.files[VARIABLE_FILE_PATH];

      if (file && 'variables' in file) return file as MemoryFileYjs;

      syncedStore.tree[VARIABLE_FILE_PATH] = VARIABLE_FILE_PATH;
      syncedStore.files[VARIABLE_FILE_PATH] = { variables: [] };
      return syncedStore.files[VARIABLE_FILE_PATH] as MemoryFileYjs;
    }, [syncedStore.files]),
  };
};

export function useProject() {
  const { projectId, projectRef } = useCurrentProject();
  return useProjectStore(projectId, projectRef);
}

export function useAssistants() {
  const { store } = useProject();
  return Object.values(store.files).filter((i): i is AssistantYjs => !!i && isAssistant(i));
}

export function usePromptAgents() {
  const { store } = useProject();
  return Object.entries(store.tree)
    .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
    .map(([id]) => store.files[id])
    .filter((i): i is AssistantYjs => !!i && isAssistant(i));
}

export function createFolder({
  store,
  name,
  parent = [],
  rootFolder,
}: {
  store: StoreContext['store'];
  name?: string;
  parent?: string[];
  rootFolder?: string;
}) {
  if (!name) {
    let index = 0;
    name = 'Folder';

    const parentPath = parent.join('/').concat('/');
    const existNames = new Set(
      Object.values(store.tree).map((i) =>
        i?.startsWith(parentPath) ? i.replace(parentPath, '').split('/')[0] : undefined
      )
    );

    while (true) {
      const n = index ? `${name} ${index}` : name;
      index++;
      if (!existNames.has(n)) {
        name = n;
        break;
      }
    }
  }

  const filepath = joinURL(rootFolder && rootFolder !== parent[0] ? rootFolder : '', ...parent, name);
  getYjsDoc(store).transact(() => {
    const key = nanoid(32);
    store.tree[key] = [filepath, '.gitkeep'].join('/');
    store.files[key] = { $base64: '' };
  });
  return filepath;
}

export function createFileName({
  store,
  name,
  defaultName,
}: {
  store: StoreContext['store'];
  name?: string;
  defaultName: string;
}) {
  if (!name) {
    let index = 0;

    const existNames = new Set(
      Object.values(store.files)
        .map((i: any) => i.name)
        .filter((i) => i)
    );

    while (true) {
      const n = index ? `${defaultName} ${index}` : defaultName;
      index++;
      if (!existNames.has(n)) {
        name = n;
        break;
      }
    }
  }

  return name;
}

export const randomId = customAlphabet('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');

export const resetTemplatesId = (templates: (Assistant & { parent?: string[] })[]) => {
  const list = cloneDeep(templates);

  list.forEach((template: Assistant & { parent?: string[] }) => {
    const { id } = template;
    const newId = nextAssistantId();
    template.id = newId;

    list.forEach((t) => {
      if (isImageAssistant(t) || isApiAssistant(t) || isFunctionAssistant(t)) {
        (t.prepareExecutes || []).forEach((x) => {
          (x.tools || [])?.forEach((tool) => {
            if (tool.id === id) {
              tool.id = newId;
            }
          });
        });
      }

      if (isPromptAssistant(t)) {
        (t.prompts || [])?.forEach((prompt) => {
          if (prompt.type === 'executeBlock' && prompt.data) {
            (prompt.data.tools || [])?.forEach((tool) => {
              if (tool.id === id) {
                tool.id = newId;
              }
            });
          }
        });
      }
    });
  });

  return list;
};

export function useCreateFile() {
  const { session } = useSessionContext();
  if (!session.user?.did) throw new Error('Unauthorized');

  return useCallback(
    ({
      store,
      parent = [],
      meta = {},
      rootFolder,
    }: {
      store: StoreContext['store'];
      parent?: string[];
      meta?: Partial<AssistantYjs>;
      rootFolder?: string;
    }) => {
      const id = (meta as any).id || nextAssistantId();
      const filename = `${id}.yaml`;
      const filepath = joinURL(rootFolder && parent[0] !== rootFolder ? rootFolder : '', ...parent, filename);
      const now = new Date().toISOString();

      const file: AssistantYjs = {
        ...meta,
        id,
        type: (meta.type || 'prompt') as any,
        createdAt: meta?.createdAt || now,
        updatedAt: meta?.updatedAt || now,
        createdBy: meta?.createdBy || session.user.did,
        updatedBy: meta?.updatedBy || session.user.did,
      };

      if (isPromptAssistant(file)) {
        if (isEmpty(file.prompts)) {
          const promptId = nanoid();
          file.prompts = { [promptId]: { index: 0, data: { type: 'message', data: { id: promptId, role: 'user' } } } };
        }
      }

      getYjsDoc(store).transact(() => {
        store.tree[id] = filepath;
        store.files[id] = file;
      });

      return {
        filepath,
        file,
      };
    },
    [session.user.did]
  );
}

export function moveFile({ store, from, to }: { store: StoreContext['store']; from: string[]; to: string[] }) {
  getYjsDoc(store).transact(() => {
    const p = from.join('/');
    for (const [key, filepath] of Object.entries(store.tree)) {
      if (filepath === p || filepath?.startsWith(p.concat('/'))) {
        const newPath = [...to, ...filepath.split('/').slice(from.length)].join('/');
        store.tree[key] = newPath;
      }
    }

    addGitkeepFileIfNeeded(store, from.slice(0, -1));
  });
}

export function deleteFile({ store, path }: { store: StoreContext['store']; path: string[] }) {
  getYjsDoc(store).transact(() => {
    const p = path.join('/');

    for (const [key, filepath] of Object.entries(store.tree)) {
      if (filepath === p || filepath?.startsWith(p.concat('/'))) {
        delete store.tree[key];
        delete store.files[key];
      }
    }

    // delete cron job that agent not exists
    const cronConfig = store.files[CRON_CONFIG_FILE_PATH] as CronFileYjs;
    if (cronConfig.jobs?.length) {
      for (let i = 0; i < cronConfig.jobs.length; ) {
        const agentId = cronConfig.jobs[i]?.agentId;
        if (!agentId || !store.files[agentId]) {
          cronConfig.jobs.splice(i, 1);
        } else {
          i++;
        }
      }
    }

    addGitkeepFileIfNeeded(store, path.slice(0, -1));
  });
}

function addGitkeepFileIfNeeded(store: StoreContext['store'], path: string[]) {
  if (path.length > 0) {
    if (Object.values(store.tree).filter((i) => i?.startsWith(path.join('/').concat('/'))).length === 0) {
      const filepath = [...path, '.gitkeep'].join('/');
      const key = nanoid(32);
      store.tree[key] = filepath;
      store.files[key] = { $base64: '' };
    }
  }
}

export const useUndoManager = (projectId: string, ref: string, key: string) => {
  const { store } = useProjectStore(projectId, ref);

  const doc = useMemo(() => getYjsDoc(store), [store]);

  const undoManager = useMemo(() => {
    const map = doc.getMap('files').get(key) as Map<Map<any>>;
    return new UndoManager([map], { doc });
  }, [doc, key]);

  const [state, setState] = useState(() => ({
    canRedo: undoManager.canRedo(),
    canUndo: undoManager.canUndo(),
    redo: () => undoManager.redo(),
    undo: () => undoManager.undo(),
  }));

  useEffect(() => {
    setState(() => ({
      canRedo: undoManager.canRedo(),
      canUndo: undoManager.canUndo(),
      redo: () => undoManager.redo(),
      undo: () => undoManager.undo(),
    }));

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
  }, [undoManager, key]);

  return state;
};

function proxyConfigFile<T extends object>(store: ReturnType<typeof syncedStore<State>>, filepath: string) {
  return new Proxy({} as T, {
    get(_, key: string) {
      const c = store.files[filepath] as T;
      return (c as any)?.[key];
    },
    set(_, p, newValue) {
      const c = store.files[filepath] as any;
      if (!c) throw new Error(`config file ${filepath} not found`);
      c[p] = newValue;
      return true;
    },
  });
}
