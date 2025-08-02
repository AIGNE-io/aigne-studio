import localForage from 'localforage';
import debounce from 'lodash/debounce';
import omit from 'lodash/omit';
import { nanoid } from 'nanoid';
import { create } from 'zustand';

export interface SessionItem {
  index: number;
  createdAt: string;
  updatedAt: string;
  messages: {
    id: string;
    createdAt: string;
    role: any;
    messages?: {
      responseAs?: any;
      taskId: string;
      content?: string;
      images?: { url: string }[];
    }[];
    content: string;
    gitRef?: string;
    parameters?: { [key: string]: any };
    images?: any[];
    objects?: any[];
    done?: boolean;
    loading?: boolean;
    cancelled?: boolean;
    error?: { message: string; [key: string]: unknown };
    inputMessages?: any[];
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

interface DebugStateStore {
  states: { [key: string]: DebugState };
  setState: (key: string, state: DebugState) => void;
  updateState: (key: string, updater: (state: DebugState) => DebugState) => void;
  getState: (key: string) => DebugState;
  getOrCreateState: (key: string, projectId: string, assistantId: string) => Promise<DebugState>;
}

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

// 提炼重复的默认状态创建函数
const createDefaultDebugState = (projectId: string, assistantId: string): DebugState => ({
  projectId,
  assistantId,
  sessions: [],
  nextSessionIndex: 1,
});

const createDefaultSession = (): SessionItem => {
  const now = new Date().toISOString();
  return {
    index: 1,
    createdAt: now,
    updatedAt: now,
    messages: [],
    chatType: 'debug' as const,
    sessionId: nanoid(),
  };
};

export const useDebugStateStore = create<DebugStateStore>()((set, get) => {
  const setItem = debounce((k: string, v: DebugState) => {
    localForage.setItem(k, v);
  }, 2000);

  const handleBeforeUnload = () => setItem.flush();
  window.addEventListener('beforeunload', handleBeforeUnload);

  return {
    states: {},
    setState: (key, state) => {
      set((prevState) => ({
        ...prevState,
        states: {
          ...prevState.states,
          [key]: state,
        },
      }));
      setItem(key, state);
    },
    updateState: (key, updater) => {
      set((prevState) => {
        const currentState = prevState.states[key] || createDefaultDebugState('', '');
        const newState = updater(currentState);
        return {
          ...prevState,
          states: {
            ...prevState.states,
            [key]: newState,
          },
        };
      });
      const newState = get().states[key];
      if (newState) {
        setItem(key, newState);
      }
    },
    getState: (key) =>
      get().states[key] || createDefaultDebugState('', ''),
    getOrCreateState: async (key, projectId, assistantId) => {
      try {
        const { states } = get();

        // 从缓存中获取
        if (states[key]) {
          return states[key];
        }

        await debugStateMigration;

        // 从 db 中恢复
        const res = await localForage.getItem<string>(key);
        const json: DebugState = typeof res === 'string' ? JSON.parse(res) : res;
        if (json?.projectId === projectId && json?.assistantId === assistantId) {
          const state = {
            ...json,
            sessions: json.sessions.map((session) => ({
              ...session,
              messages: session.messages.map((i) => ({ ...i, loading: undefined })),
              sessionId: session.sessionId ?? nanoid(),
            })),
          };
          set((prevState) => ({
            ...prevState,
            states: {
              ...prevState.states,
              [key]: state,
            },
          }));
          return state;
        }
      } catch (error) {
        console.error('initialize default debug state error', error);
      }

      // 创建一个新的
      const state = {
        ...createDefaultDebugState(projectId, assistantId),
        sessions: [createDefaultSession()],
        nextSessionIndex: 2,
      };

      set((prevState) => ({
        ...prevState,
        states: {
          ...prevState.states,
          [key]: state,
        },
      }));
      return state;
    },
  };
});
