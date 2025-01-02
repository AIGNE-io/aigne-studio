import type { ProjectWithUserInfo } from '@app/libs/project';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ProjectGitSetting = {
  projectId: string;
  defaultBranch: string;
  currentBranch: string;
};

type CurrentGitState = {
  currentProjectId: string;
  projectGitSettings: Array<ProjectGitSetting>;
};

type CurrentGitActions = {
  setProjectGitSettings: (projects: Array<ProjectWithUserInfo>) => void;
  setProjectCurrentBranch: (projectId: string, branch: string) => void;
  getProjectGitSetting: (projectId: string) => ProjectGitSetting;
  getCurrentDefaultBranch: () => string;
  getCurrentBranch: () => string;
};

type CurrentGitStore = CurrentGitState & CurrentGitActions;

export const DefaultState: CurrentGitState = {
  currentProjectId: '',
  projectGitSettings: [],
};

const currentGitStore = create<CurrentGitStore>()(
  persist(
    (set, get) => ({
      ...DefaultState,
      setProjectGitSettings: (projects) => {
        const { projectGitSettings } = get();
        set({
          projectGitSettings: projects.map((project) => {
            const projectGitSetting = projectGitSettings.find((i) => i.projectId === project.id);
            return {
              defaultBranch: project.gitDefaultBranch!,
              currentBranch: projectGitSetting ? projectGitSetting.currentBranch : project.gitDefaultBranch!,
              projectId: project.id,
            };
          }),
        });
      },
      setProjectCurrentBranch: (projectId, branch) => {
        const { projectGitSettings } = get();
        const project = projectGitSettings.find((i) => i.projectId === projectId);
        if (project) {
          project.currentBranch = branch;
          set({
            projectGitSettings,
          });
        }
      },
      getProjectGitSetting: (projectId) => {
        const { projectGitSettings } = get();
        const project = projectGitSettings.find((i) => i.projectId === projectId);
        return project!;
      },
      getCurrentDefaultBranch: () => {
        const { projectGitSettings, currentProjectId } = get();
        return projectGitSettings.find((i) => i.projectId === currentProjectId)?.defaultBranch ?? 'main';
      },
      getCurrentBranch: () => {
        const { projectGitSettings, currentProjectId } = get();
        return projectGitSettings.find((i) => i.projectId === currentProjectId)?.currentBranch ?? 'main';
      },
    }),
    {
      name: 'project-git-store',
    }
  )
);

export const useCurrentGitStore = currentGitStore;

export default currentGitStore;

export const getDefaultBranch = () => currentGitStore.getState().getCurrentDefaultBranch();
