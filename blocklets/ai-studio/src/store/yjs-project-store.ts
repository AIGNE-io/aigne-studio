import { FileTypeYjs } from '@blocklet/ai-runtime/types';
import { Doc, syncedStore } from '@blocklet/co-git/yjs';
import { produce } from 'immer';
import { joinURL } from 'ufo';
import { IndexeddbPersistence } from 'y-indexeddb';
import { WebsocketProvider } from 'y-websocket';
import { create } from 'zustand';

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

interface YjsProjectStore {
  stores: { [key: string]: StoreContext };
  setStore: (key: string, store: StoreContext) => void;
  updateStore: (key: string, updater: (store: StoreContext) => StoreContext) => void;
  getStore: (key: string) => StoreContext | undefined;
  createStore: (projectId: string, gitRef: string) => StoreContext;
}

export const useYjsProjectStore = create<YjsProjectStore>()((set, get) => ({
  stores: {},
  setStore: (key, store) =>
    set(
      produce((draft) => {
        draft.stores[key] = store;
      })
    ),
  updateStore: (key, updater) =>
    set(
      produce((draft) => {
        if (draft.stores[key]) {
          draft.stores[key] = updater(draft.stores[key]);
        }
      })
    ),
  getStore: (key) => get().stores[key],
  createStore: (projectId, gitRef) => {
    const url = (() => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = new URL(`${wsProtocol}://${window.location.host}`);
      wsUrl.pathname = joinURL(window.blocklet?.prefix || '/', 'api/ws', projectId);
      return wsUrl.toString();
    })();

    const doc = new Doc();
    const provider = new WebsocketProvider(url, gitRef, doc, { connect: false, maxBackoffTime: 10 * 60e3 });
    const store = syncedStore<State>({ files: {}, tree: {} }, doc);
    const indexeddb = new IndexeddbPersistence(`${projectId}-${gitRef}`, doc);

    const storeContext: StoreContext = {
      synced: provider.synced,
      store,
      awareness: { clients: {}, files: {} },
      provider,
      indexeddb,
    };

    return storeContext;
  },
}));
