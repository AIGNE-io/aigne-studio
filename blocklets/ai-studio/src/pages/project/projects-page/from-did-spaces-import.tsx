/* eslint-disable consistent-return */
import Project from '@api/store/models/project';
import currentGitStore from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  styled,
} from '@mui/material';
import { useAsyncEffect } from 'ahooks';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useProjectsState } from '../../../contexts/projects';
import { getErrorMessage } from '../../../libs/api';
import Add from '../icons/add';
import Git from '../icons/git';

type RemoteRepoSettingForm = {
  name: string;
  description: string;
};

export default function FromDidSpacesImport() {
  const { t } = useLocaleContext();
  const [search] = useSearchParams();
  const endpoint = search.get('endpoint');
  const id = useId();
  const navigate = useNavigate();
  const dialogState = usePopupState({ variant: 'dialog', popupId: id });
  const { listProjectsByDidSpaces, fromDidSpacesImport } = useProjectsState();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>(undefined);

  useAsyncEffect(async () => {
    if (!endpoint) {
      return;
    }

    dialogState.open();
    const data = await listProjectsByDidSpaces(endpoint);
    setProjects(data);
    setSelectedProject(data[0]);
  }, [endpoint]);

  const form = useForm<RemoteRepoSettingForm>({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const importProject = useCallback(
    async (value: RemoteRepoSettingForm) => {
      try {
        if (!selectedProject?._id) {
          return null;
        }

        const project = await fromDidSpacesImport({
          endpoint: endpoint!,
          projectId: selectedProject?._id,
          props: {
            description: value.description,
          },
        });

        currentGitStore.setState({
          currentProjectId: project?._id,
        });
        dialogState.close();
        form.reset(value);

        navigate(joinURL('/projects', project._id));
      } catch (error) {
        form.reset(value);
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [dialogState, endpoint, form, fromDidSpacesImport, navigate, selectedProject?._id]
  );

  const goToDidSpacesImport = () => {
    window.location.href = joinURL(window.origin, window.blocklet?.prefix ?? '/', 'api/import/from-did-spaces');
  };

  return (
    <>
      <Tooltip title={t('import.didSpacesDescription')}>
        <ProjectItemRoot onClick={goToDidSpacesImport} justifyContent="center" alignItems="center">
          <Stack height={60} justifyContent="center" alignItems="center">
            <Git sx={{ fontSize: 32, color: (theme) => theme.palette.text.disabled }} />
          </Stack>
          <Box sx={{ mt: 1, color: (theme) => theme.palette.text.secondary }}>{t('import.didSpaces')}</Box>
        </ProjectItemRoot>
      </Tooltip>

      <Dialog
        {...bindDialog(dialogState)}
        maxWidth="sm"
        fullWidth
        component="form"
        onSubmit={form.handleSubmit(importProject)}>
        <DialogTitle>{t('remoteGitRepo')}</DialogTitle>
        <DialogContent>
          <Stack gap={2}>
            <TextField
              {...form.register('name')}
              select
              label={t('projectSetting.name')}
              defaultValue={selectedProject?._id}
              onChange={(e) => {
                const currentProject = projects.find((p) => p._id === e.target.value);

                if (currentProject) {
                  setSelectedProject(currentProject);
                  form.setValue('description', currentProject?.description ?? '', {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                }
              }}>
              {projects.map((project) => (
                <MenuItem key={project.name} value={project._id} defaultChecked={project._id === selectedProject?._id}>
                  {project.name}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              {...form.register('description')}
              label={t('projectSetting.description')}
              multiline
              rows={4}
              sx={{ width: 1 }}
              InputProps={{
                readOnly: true,
                onFocus: (e) => (e.currentTarget.readOnly = false),
              }}
              focused
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={dialogState.close}>{t('cancel')}</Button>
          <LoadingButton
            variant="contained"
            type="submit"
            loading={form.formState.isSubmitting}
            loadingPosition="start"
            startIcon={<Add />}>
            {t('import.remote')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

const ProjectItemRoot = styled(Stack)`
  width: 100%;
  cursor: pointer;
  overflow: hidden;
  padding: ${({ theme }) => theme.shape.borderRadius * 1.5}px;
  position: relative;
  border-width: 1px;
  border-style: solid;
  border-color: ${({ theme }) => theme.palette.divider};
  border-radius: 16px;

  &.selected,
  &:hover {
    box-shadow: 0px 1px 3px rgba(0, 0, 0, 0.08);

    .action {
      display: flex;
    }
  }

  .logo {
    border-radius: ${({ theme }) => theme.shape.borderRadius}px;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: ${({ theme }) => theme.shape.borderRadius}px;
    }
  }

  .name {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .desc {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .action {
    display: none;
  }
`;
