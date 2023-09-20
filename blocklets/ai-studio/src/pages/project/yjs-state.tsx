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
import { nanoid } from 'nanoid';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import joinUrl from 'url-join';
import { WebsocketProvider, messageSync } from 'y-websocket';

import { Template } from '../../../api/src/store/templates';
import { PREFIX } from '../../libs/api';

export type State = {
  files: { [key: string]: Template | { $base64: string } };
  tree: { [key: string]: string };
};

export function isTemplate(value?: State['files'][string]): value is Template {
  return typeof (value as any)?.id === 'string';
}

export interface StoreContext {
  ready: boolean;
  store: ReturnType<typeof syncedStore<State>>;
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
  const [ready, setReady] = useState(false);

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

  useEffect(() => {
    setReady(false);

    const provider = new WebsocketProvider(url, gitRef, doc, { params: { token: Cookies.get('login_token')! } });

    // NOTE: 修复第一次连接时由于 server 端初始化 state 耗时导致没有同步成功的问题
    const interval = setInterval(() => {
      if (provider.ws && provider.ws.readyState === WebSocket.OPEN) {
        const encoder = createEncoder();
        writeVarUint(encoder, messageSync);
        syncProtocols.writeSyncStep1(encoder, doc);
        provider.ws.send(toUint8Array(encoder));
      }
    }, 1000);

    provider.once('synced', () => {
      setReady(true);
      clearInterval(interval);
    });

    return () => {
      clearInterval(interval);
      provider.destroy();
    };
  }, [url, doc, gitRef]);

  const store = useMemo(() => syncedStore<State>({ files: {}, tree: {} }, doc), [doc]);

  const ctx = useMemo<StoreContext>(() => ({ store, ready }), [store, ready]);

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
