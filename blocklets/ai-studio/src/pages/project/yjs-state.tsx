import {
  Doc,
  createEncoder,
  getYjsDoc,
  syncProtocols,
  syncedStore,
  toUint8Array,
  useSyncedStore,
  writeVarUint,
} from '@blocklet/co-git/yjs';
import dayjs from 'dayjs';
import Cookies from 'js-cookie';
import pick from 'lodash/pick';
import { nanoid } from 'nanoid';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import joinUrl from 'url-join';
import { WebsocketProvider, messageSync } from 'y-websocket';

import { Template } from '../../../api/src/store/templates';
import { useSessionContext } from '../../contexts/session';
import { PREFIX } from '../../libs/api';

export type State = {
  files: { [key: string]: Template | { $base64: string } };
  tree: { [key: string]: string };
};

export function isTemplate(value?: State['files'][string]): value is Template {
  return typeof (value as any)?.id === 'string';
}

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
}

const storeContext = createContext<StoreContext | null>(null);

export function StoreProvider({
  projectId,
  gitRef,
  children,
}: {
  projectId: string;
  gitRef: string;
  children: ReactNode;
}) {
  const [synced, setSynced] = useState(false);

  const url = useMemo(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = new URL(`${wsProtocol}://${window.location.hostname}`);
    wsUrl.pathname = joinUrl(PREFIX, 'api/ws', projectId);
    return wsUrl.toString();
  }, [projectId]);

  const doc = useMemo(() => new Doc(), [projectId, gitRef]);

  useEffect(() => {
    return () => doc.destroy();
  }, [doc]);

  const [awareness, setAwareness] = useState<StoreContext['awareness']>({ clients: {}, files: {} });

  const provider = useMemo(
    () => new WebsocketProvider(url, gitRef, doc, { params: { token: Cookies.get('login_token')! } }),
    [url, gitRef, doc]
  );

  const { session } = useSessionContext();
  useEffect(() => {
    provider.awareness.setLocalStateField('user', session.user);
  }, [session, provider]);

  useEffect(() => {
    let interval: number;

    setSynced(provider.synced);

    if (!provider.synced) {
      provider.once('synced', () => {
        setSynced(true);
        clearInterval(interval);
      });

      // NOTE: 修复第一次连接时由于 server 端初始化 state 耗时导致没有同步成功的问题
      interval = window.setInterval(() => {
        if (provider.ws && provider.ws.readyState === WebSocket.OPEN) {
          const encoder = createEncoder();
          writeVarUint(encoder, messageSync);
          syncProtocols.writeSyncStep1(encoder, provider.doc);
          provider.ws.send(toUint8Array(encoder));
        }
      }, 1000);
    }

    provider.awareness.on('change', () => {
      const states = provider.awareness.getStates();

      const awareness: StoreContext['awareness'] = {
        clients: {},
        files: {},
      };

      for (const [clientId, state] of states.entries()) {
        if (clientId === provider.awareness.clientID) continue;
        awareness.clients[clientId] = pick(state.user, 'did', 'fullName', 'avatar');

        const path: (string | number)[] = state.focus?.path;
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

      setAwareness(awareness);
    });

    return () => {
      clearInterval(interval);
      provider.destroy();
    };
  }, [provider]);

  const store = useMemo(() => syncedStore<State>({ files: {}, tree: {} }, doc), [doc]);

  const ctx = useMemo<StoreContext>(
    () => ({ store, synced, awareness, provider }),
    [store, synced, awareness, provider]
  );

  return <storeContext.Provider value={ctx}>{children}</storeContext.Provider>;
}

export function useStore() {
  const store = useContext(storeContext);
  if (!store) throw new Error('Missing required context storeContext');

  return {
    ...store,
    store: useSyncedStore(store.store, [store.store]),
  };
}

export function createFolder({
  store,
  parent,
  name,
}: {
  store: StoreContext['store'];
  parent: string[];
  name: string;
}) {
  getYjsDoc(store).transact(() => {
    const filepath = [...parent, name, '.gitkeep'].join('/');
    const key = nanoid(32);
    store.tree[key] = filepath;
    store.files[key] = { $base64: '' };
  });
}

export const nextTemplateId = () => `${dayjs().format('YYYYMMDDHHmmss')}-${nanoid(6)}`;

export function createFile({
  store,
  parent,
  meta,
}: {
  store: StoreContext['store'];
  parent?: string[];
  meta?: Partial<Template>;
}) {
  const id = meta?.id || nextTemplateId();
  const filename = `${id}.yaml`;
  const filepath = [...(parent ?? []), filename].join('/');
  const key = nanoid(32);
  const now = new Date().toISOString();

  const template = { id, createdAt: now, updatedAt: now, createdBy: '', updatedBy: '', ...meta };
  getYjsDoc(store).transact(() => {
    store.tree[key] = filepath;
    store.files[key] = template;
  });

  return {
    filepath,
    template,
  };
}

export function moveFile({ store, from, to }: { store: StoreContext['store']; from: string[]; to: string[] }) {
  getYjsDoc(store).transact(() => {
    const p = from.join('/');
    for (const [key, filepath] of Object.entries(store.tree)) {
      if (filepath?.startsWith(p)) {
        const newPath = [...to, ...filepath.split('/').slice(from.length)].join('/');
        store.tree[key] = newPath;
      }
    }
  });
}

export function deleteFile({ store, path }: { store: StoreContext['store']; path: string[] }) {
  getYjsDoc(store).transact(() => {
    const p = path.join('/');
    for (const [key, filepath] of Object.entries(store.tree)) {
      if (filepath?.startsWith(p)) {
        store.tree[key] = undefined;
        store.files[key] = undefined;
      }
    }
  });
}

export function importFiles({
  store,
  parent = [],
  files,
}: {
  store: StoreContext['store'];
  parent?: string[];
  files: (Template & { path?: string[] })[];
}) {
  getYjsDoc(store).transact(() => {
    for (const file of files) {
      const path = parent
        .concat(file.path ?? [])
        .concat(`${file.id}.yaml`)
        .join('/');
      const key =
        Object.keys(store.tree).find((key) => {
          const f = store.files[key];
          return isTemplate(f) && f.id === file.id;
        }) || nanoid(32);

      store.files[key] = file;
      store.tree[key] = path;
    }
  });
}
