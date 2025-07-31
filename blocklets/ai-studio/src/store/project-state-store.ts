import { produce } from 'immer';
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

export const useProjectStateStore = create<ProjectStateStore>()((set, get) => ({
  states: {},
  setState: (key, state) =>
    set(
      produce((draft) => {
        draft.states[key] = state;
      })
    ),
  updateState: (key, updater) =>
    set(
      produce((draft) => {
        draft.states[key] = updater(draft.states[key] || { branches: [], commits: [] });
      })
    ),
  getState: (key) => get().states[key] || { branches: [], commits: [] },
}));
