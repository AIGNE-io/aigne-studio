import { produce } from 'immer';
import { create } from 'zustand';

import * as api from '../libs/project';

export type ProjectsSection = 'templates' | 'projects' | 'examples';

export interface ProjectsState {
  templates: api.ProjectWithUserInfo[];
  projects: api.ProjectWithUserInfo[];
  examples: api.ProjectWithUserInfo[];
  loading: boolean;
  error?: Error;
  selected?: { section: ProjectsSection; id: string; blockletDid?: string };
  // ps: immer 不支持 HTMLElement 类型，只能手动更新
  menuAnchor?: ProjectsState['selected'] & { anchor: HTMLElement };
}

interface ProjectsStore extends ProjectsState {
  setState: (updater: (state: ProjectsState) => ProjectsState) => void;
  setSelected: (selected: ProjectsState['selected']) => void;
  setMenuAnchor: (menuAnchor: ProjectsState['menuAnchor']) => void;
  clearState: () => void;
}

export const useProjectsStore = create<ProjectsStore>()((set, get) => ({
  templates: [],
  projects: [],
  examples: [],
  loading: false,
  setState: (updater) => set(produce((state) => updater(state))),
  setSelected: (selected) =>
    set(
      produce((state) => {
        state.selected = selected;
      })
    ),
  setMenuAnchor: (menuAnchor) => {
    const currentState = get();
    set({ ...currentState, menuAnchor });
  },
  clearState: () =>
    set(
      produce((state) => {
        state.templates = [];
        state.projects = [];
        state.examples = [];
        state.loading = false;
        state.error = undefined;
        state.selected = undefined;
        state.menuAnchor = undefined;
      })
    ),
}));
