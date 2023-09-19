import { getYjsDoc, syncedStore, useSyncedStore } from '@blocklet/co-git/yjs';
import type { MappedTypeDescription } from '@syncedstore/core/types/doc';
import dayjs from 'dayjs';
import Cookies from 'js-cookie';
import { nanoid } from 'nanoid';
import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import joinUrl from 'url-join';
import { WebsocketProvider } from 'y-websocket';

import { Template } from '../../../api/src/store/templates';
import { PREFIX } from '../../libs/api';

export type State = {
  files: { [key: string]: Template | { $base64: string } };
  tree: { [key: string]: string };
};

export function isTemplate(value: State['files'][string]): value is Template {
  return typeof (value as any).id === 'string';
}

export interface StoreContext {
  store: MappedTypeDescription<State>;
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

  const store = useMemo(() => syncedStore<State>({ files: {}, tree: {} }), []);
  const doc = useMemo(() => getYjsDoc(store), [store]);
  const provider = useMemo(() => {
    return new WebsocketProvider(url, gitRef, doc, { params: { token: Cookies.get('login_token')! } });
  }, [url, doc, gitRef]);

  useEffect(() => {
    return () => provider.destroy();
  }, [provider]);

  useEffect(() => {
    provider.once('synced', () => setSynced(true));
  }, [doc, provider]);

  const ctx = useMemo<StoreContext>(
    () => ({
      store,
    }),
    [store]
  );

  if (!synced) {
    return null;
  }

  return <storeContext.Provider value={ctx}>{children}</storeContext.Provider>;
}

export function useStore() {
  const store = useContext(storeContext);
  if (!store) throw new Error('Missing required context storeContext');
  return {
    store: useSyncedStore(store.store),
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
  meta?: Template;
}) {
  const id = meta?.id || nextTemplateId();
  const filename = `${id}.yaml`;
  const filepath = [...(parent ?? []), filename].join('/');
  const key = nanoid(32);
  const now = new Date().toISOString();

  getYjsDoc(store).transact(() => {
    store.tree[key] = filepath;
    store.files[key] = { id, createdAt: now, updatedAt: now, createdBy: '', updatedBy: '', ...meta };
  });

  return filepath;
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
