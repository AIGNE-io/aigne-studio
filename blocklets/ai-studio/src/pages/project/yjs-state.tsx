import {
  Doc,
  createEncoder,
  getYjsDoc,
  syncedStore,
  toUint8Array,
  useSyncedStore,
  writeVarUint,
} from '@blocklet/co-git/yjs';
import dayjs from 'dayjs';
import Cookies from 'js-cookie';
import { cloneDeep } from 'lodash';
import pick from 'lodash/pick';
import sortBy from 'lodash/sortBy';
import { nanoid } from 'nanoid';
import { useCallback, useEffect } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';
import joinUrl from 'url-join';
import { writeSyncStep1 } from 'y-protocols/sync';
import { WebsocketProvider, messageSync } from 'y-websocket';

import { TemplateYjs } from '../../../api/src/store/projects';
import { CallPromptMessage, PromptMessage, Template } from '../../../api/src/store/templates';
import { PREFIX } from '../../libs/api';

export type State = {
  files: { [key: string]: TemplateYjs | { $base64: string } };
  tree: { [key: string]: string };
};

export function isTemplate(value?: State['files'][string]): value is TemplateYjs {
  return typeof (value as any)?.id === 'string';
}

export function isPromptMessage(message: any): message is PromptMessage {
  return ['system', 'user', 'assistant'].includes(message?.role);
}

export function isCallPromptMessage(message: any): message is CallPromptMessage {
  return message?.role === 'call-prompt';
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

const stores: Record<string, RecoilState<StoreContext>> = {};

const createStore = (projectId: string, gitRef: string) => {
  const key = `projectStore-${projectId}-${gitRef}`;
  let s = stores[key];
  if (!s) {
    s = atom<StoreContext>({
      key,
      dangerouslyAllowMutability: true,
      default: (() => {
        const url = (() => {
          const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
          const wsUrl = new URL(`${wsProtocol}://${window.location.host}`);
          wsUrl.pathname = joinUrl(PREFIX, 'api/ws', projectId);
          return wsUrl.toString();
        })();

        const doc = new Doc();

        const provider = new WebsocketProvider(url, gitRef, doc, {
          connect: false,
          params: { token: Cookies.get('login_token')! },
        });

        const store = syncedStore<State>({ files: {}, tree: {} }, doc);

        return {
          store,
          awareness: { clients: {}, files: {} },
          provider,
          synced: provider.synced,
        };
      })(),
    });
    stores[key] = s;
  }
  return s;
};

export const useStore = (projectId: string, gitRef: string, connect?: boolean) => {
  const [store, setStore] = useRecoilState(createStore(projectId, gitRef));

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

      setStore((v) => ({ ...v, awareness }));
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

  return {
    ...store,
    store: syncedStore,
    getTemplateById: useCallback(
      (templateId: string) => {
        const file = syncedStore.files[templateId];
        return isTemplate(file) ? file : undefined;
      },
      [syncedStore.files]
    ),
  };
};

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

export const resetTemplatesId = (templates: (Template & { parent?: string[] })[]) => {
  const list = cloneDeep(templates);

  list.forEach((template) => {
    const { id } = template;
    const newId = nextTemplateId();

    template.id = newId;
    list.forEach((t) => {
      if (t.next && t.next?.id === id) {
        t.next.id = newId;
      }
    });
  });

  return list;
};

export function createFile({
  store,
  parent,
  meta,
}: {
  store: StoreContext['store'];
  parent?: string[];
  meta?: Partial<TemplateYjs>;
}) {
  const id = meta?.id || nextTemplateId();
  const filename = `${id}.yaml`;
  const filepath = [...(parent ?? []), filename].join('/');
  const now = new Date().toISOString();

  const template = { id, createdAt: now, updatedAt: now, createdBy: '', updatedBy: '', ...meta };
  getYjsDoc(store).transact(() => {
    store.tree[id] = filepath;
    store.files[id] = template;
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
        delete store.tree[key];
        delete store.files[key];
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
    for (const { path, ...file } of files) {
      const p = parent
        .concat(path ?? [])
        .concat(`${file.id}.yaml`)
        .join('/');
      const key =
        Object.keys(store.tree).find((key) => {
          const f = store.files[key];
          return isTemplate(f) && f.id === file.id;
        }) || nanoid(32);

      store.files[key] = templateYjsFromTemplate(file);
      store.tree[key] = p;
    }
  });
}

export function templateYjsToTemplate(template: TemplateYjs): Template {
  return {
    ...template,
    prompts: template.prompts && sortBy(Object.values(template.prompts), 'index').map(({ data }) => data),
    parameters:
      template.parameters &&
      Object.fromEntries(
        Object.entries(template.parameters).map(([param, parameter]) => [
          param,
          parameter.type === 'select'
            ? {
                ...parameter,
                options:
                  parameter.options && sortBy(Object.values(parameter.options), (i) => i.index).map((i) => i.data),
              }
            : parameter,
        ])
      ),
    branch: template.branch && {
      branches: sortBy(Object.values(template.branch.branches), 'index').map(({ data }) => data),
    },
    datasets: template.datasets && sortBy(Object.values(template.datasets), 'index').map(({ data }) => data),
    tests: template.tests && sortBy(Object.values(template.tests), 'index').map(({ data }) => data),
  };
}

export function templateYjsFromTemplate(template: Template): TemplateYjs {
  return {
    ...template,
    prompts:
      template.prompts &&
      Object.fromEntries(
        template.prompts?.map((prompt, index) => [
          prompt.id,
          {
            index,
            data: prompt,
          },
        ])
      ),
    parameters:
      template.parameters &&
      Object.fromEntries(
        Object.entries(template.parameters).map(([param, parameter]) => [
          param,
          parameter.type === 'select'
            ? {
                ...parameter,
                options:
                  parameter.options &&
                  Object.fromEntries(parameter.options.map((option, index) => [option.id, { index, data: option }])),
              }
            : parameter,
        ])
      ),
    branch: template.branch && {
      branches: Object.fromEntries(
        template.branch.branches.map((branch, index) => [branch.id, { index, data: branch }])
      ),
    },
    datasets:
      template.datasets &&
      Object.fromEntries(template.datasets.map((dataset, index) => [dataset.id, { index, data: dataset }])),
    tests: template.tests && Object.fromEntries(template.tests.map((test, index) => [test.id, { index, data: test }])),
  };
}
