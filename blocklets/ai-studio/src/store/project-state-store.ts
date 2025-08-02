import { create } from 'zustand';

import Project from '../../api/src/store/models/project';
import { Commit } from '../libs/log';

export interface ProjectState {
  project?: Project;
  branches: string[];
  commits: Commit[];
  loading?: boolean;
  error?: Error;
}

interface ProjectStateStore {
  states: { [key: string]: ProjectState };
  setState: (key: string, state: ProjectState) => void;
  updateState: (key: string, updater: (state: ProjectState) => ProjectState) => void;
  getState: (key: string) => ProjectState;
}

// 提炼重复的默认状态创建函数
const createDefaultProjectState = (): ProjectState => ({
  branches: [],
  commits: [],
});

export const useProjectStateStore = create<ProjectStateStore>()((set, get) => ({
  states: {},
  setState: (key, state) =>
    set((prevState) => ({
      ...prevState,
      states: {
        ...prevState.states,
        [key]: state,
      },
    })),
  updateState: (key, updater) =>
    set((prevState) => {
      const currentState = prevState.states[key] || createDefaultProjectState();
      const newState = updater(currentState);
      return {
        ...prevState,
        states: {
          ...prevState.states,
          [key]: newState,
        },
      };
    }),
  getState: (key) => get().states[key] || createDefaultProjectState(),
}));
