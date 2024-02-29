import { create } from 'zustand';

type CurrentGitState = {
  defaultBranch: string;
  currentBranch: string;
};

type CurrentGitActions = {};

type CurrentGitStore = CurrentGitState & CurrentGitActions;

export const DefaultState: CurrentGitState = {
  defaultBranch: 'main',
  currentBranch: 'main',
};

const currentGitStore = create<CurrentGitStore>()(() => ({
  ...DefaultState,
}));

export default currentGitStore;

export const getDefaultBranch = () => () => currentGitStore.getState().defaultBranch;
