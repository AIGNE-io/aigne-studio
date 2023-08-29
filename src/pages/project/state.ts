import { useUpdate } from 'ahooks';
import equal from 'fast-deep-equal';
import produce from 'immer';
import { WritableDraft } from 'immer/dist/internal';
import { omit } from 'lodash';
import { useCallback, useDeferredValue, useEffect, useRef } from 'react';
import { RecoilState, atom, useRecoilState } from 'recoil';

import { EntryWithMeta } from '../../../api/src/routes/tree';
import { Project } from '../../../api/src/store/projects';
import { Template } from '../../../api/src/store/templates';
import { getBranches } from '../../libs/branche';
import * as branchApi from '../../libs/branche';
import { Commit, getLogs } from '../../libs/log';
import { getProject } from '../../libs/project';
import * as api from '../../libs/tree';

export const defaultBranch = 'main';

export interface ProjectState {
  project?: Project;
  files: EntryWithMeta[];
  branches: string[];
  commits: Commit[];
  loading?: boolean;
  error?: Error;
}

const projectStates: { [key: string]: RecoilState<ProjectState> } = {};

const projectState = (projectId: string) => {
  projectStates[projectId] ??= atom<ProjectState>({
    key: `projectState-${projectId}`,
    default: { files: [], branches: [], commits: [] },
  });

  return projectStates[projectId]!;
};

export const useProjectState = (projectId: string, ref: string) => {
  const [state, setState] = useRecoilState(projectState(projectId));

  const refetch = useCallback(async () => {
    setState((v) => ({ ...v, loading: true }));
    try {
      const [project, { files }, { branches }, { commits }] = await Promise.all([
        getProject(projectId),
        api.getTree({ projectId, ref }),
        getBranches({ projectId }),
        getLogs({ projectId, ref }),
      ]);
      setState((v) => ({ ...v, project, ref, files, branches, commits, error: undefined }));
      return { files };
    } catch (error) {
      setState((v) => ({ ...v, error }));
      throw error;
    } finally {
      setState((v) => ({ ...v, loading: false }));
    }
  }, [projectId, ref, setState]);

  const createFile: typeof api.createFile = useCallback(
    async (args) => {
      const res = await api.createFile(args as any);
      await refetch();
      return res as any;
    },
    [refetch]
  );

  const deleteFile = useCallback(
    async (...args: Parameters<typeof api.deleteFile>) => {
      await api.deleteFile(...args);
      await refetch();
    },
    [refetch]
  );

  const moveFile = useCallback(
    async (...args: Parameters<typeof api.moveFile>) => {
      await api.moveFile(...args);
      await refetch();
    },
    [refetch]
  );

  const putFile = useCallback(
    async (...args: Parameters<typeof api.putFile>) => {
      const res = await api.putFile(...args);
      await refetch();
      return res;
    },
    [refetch]
  );

  const createBranch = useCallback(
    async (...args: Parameters<typeof branchApi.createBranch>) => {
      const { branches } = await branchApi.createBranch(...args);
      setState((v) => ({ ...v, branches }));
      return { branches };
    },
    [setState]
  );

  const updateBranch = useCallback(
    async (...args: Parameters<typeof branchApi.updateBranch>) => {
      const { branches } = await branchApi.updateBranch(...args);
      setState((v) => ({ ...v, branches }));
      return { branches };
    },
    [setState]
  );

  const deleteBranch = useCallback(
    async (...args: Parameters<typeof branchApi.deleteBranch>) => {
      const { branches } = await branchApi.deleteBranch(...args);
      setState((v) => ({ ...v, branches }));
      return { branches };
    },
    [setState]
  );

  return { state, refetch, createFile, deleteFile, moveFile, putFile, createBranch, updateBranch, deleteBranch };
};

export type FormState = ReturnType<typeof useFormState>;

export function useFormState() {
  const update = useUpdate();

  const state = useRef<{
    original?: Template;
    form?: Template;
    deletedBranchTemplateIds: Set<string>;
    formChanged: boolean;
    saving?: boolean;
    setForm: (recipe: Template | ((value: WritableDraft<Template>) => void)) => void;
    resetForm: (template?: Template) => void;
  }>({
    deletedBranchTemplateIds: new Set(),
    formChanged: false,
    setForm: (recipe: Template | ((value: WritableDraft<Template>) => void)) => {
      if (typeof recipe === 'function' && !state.current.form) throw new Error('form not initialized');

      const branches =
        state.current.form?.branch?.branches
          .map((i) => i.template?.id)
          .filter((i): i is NonNullable<typeof i> => !!i) ?? [];

      const newForm =
        typeof recipe === 'function'
          ? produce(state.current.form!, (draft) => {
              recipe(draft);
            })
          : recipe;

      const newBranches =
        newForm?.branch?.branches.map((i) => i.template?.id).filter((i): i is NonNullable<typeof i> => !!i) ?? [];

      for (const i of branches.filter((i) => !newBranches.includes(i))) {
        state.current.deletedBranchTemplateIds.add(i);
      }

      state.current.form = newForm;

      update();
    },
    resetForm: (template?: Template) => {
      state.current.form = template;
      state.current.original = template;
      state.current.deletedBranchTemplateIds.clear();
      update();
    },
  });

  const f = useDeferredValue(state.current.form);
  const o = useDeferredValue(state.current.original);

  useEffect(() => {
    if (!f || !o) {
      state.current.formChanged = false;
      return;
    }

    const omitParameterValue = (v: Template) => ({
      ...v,
      parameters: Object.fromEntries(
        Object.entries(v?.parameters ?? {}).map(([key, val]) => [key, omit(val, 'value')])
      ),
    });

    state.current.formChanged = !equal(omitParameterValue(f), omitParameterValue(o));
  }, [f, o]);

  return state;
}
