/* eslint-disable consistent-return */
import Project from '@api/store/models/project';
import { useSessionContext } from '@app/contexts/session';
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
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAsyncEffect } from 'ahooks';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { cloneElement, useCallback, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { joinURL, withQuery } from 'ufo';

import { useProjectsState } from '../../../contexts/projects';
import { getErrorMessage } from '../../../libs/api';
import Add from '../icons/add';
import Close from '../icons/close';

type ProjectSettingForm = {
  _id: string;
  name: string;
  description: string;
};

export default function FromDidSpacesImport({ children }: { children: any }) {
  const { t } = useLocaleContext();
  const [search, setSearchParams] = useSearchParams();
  const endpoint = search.get('endpoint');
  const id = useId();
  const navigate = useNavigate();
  const dialogState = usePopupState({ variant: 'dialog', popupId: id });
  const { listProjectsByDidSpaces, fromDidSpacesImport } = useProjectsState();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const { session } = useSessionContext();

  useAsyncEffect(async () => {
    try {
      setLoading(true);

      if (!endpoint) {
        return;
      }

      dialogState.open();
      const data = await listProjectsByDidSpaces(endpoint);
      setProjects(data);
    } catch (error) {
      console.error(error);
      Toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const form = useForm<ProjectSettingForm>({
    defaultValues: {
      _id: '',
      name: '',
      description: '',
    },
  });

  const importProject = useCallback(
    async (value: ProjectSettingForm) => {
      try {
        if (!value._id) {
          return null;
        }

        const project = await fromDidSpacesImport({
          endpoint: endpoint!,
          projectId: value._id,
          props: {
            name: value.name,
            description: value.description,
          },
        });

        currentGitStore.setState({
          currentProjectId: project._id,
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
    [dialogState, endpoint, form, fromDidSpacesImport, navigate]
  );

  const cancelImport = () => {
    if (search.has('endpoint')) {
      search.delete('endpoint');
      setSearchParams(search);
    }

    dialogState.close();
  };

  const goToDidSpacesImport = () => {
    session.connectToDidSpaceForImport({
      onSuccess: (response: { importUrl: string }, decrypt: (value: string) => string) => {
        const importUrl = decrypt(response.importUrl);
        window.location.href = withQuery(importUrl, {
          redirectUrl: window.location.href,
        });
      },
    });
  };

  return (
    <>
      {cloneElement(children, { onClick: () => goToDidSpacesImport() })}

      <Dialog
        {...bindDialog(dialogState)}
        maxWidth="sm"
        fullWidth
        component="form"
        onSubmit={form.handleSubmit(importProject)}>
        <DialogTitle className="between">
          <Box>{t('import.didSpacesTitle')}</Box>

          <IconButton size="small" onClick={() => dialogState.close()}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack gap={2}>
            <Box>
              <Typography variant="subtitle2">{t('projectSetting.selectProject')}</Typography>
              <TextField
                sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
                {...form.register('_id', { required: true })}
                select
                label={t('projectSetting.selectProject')}
                defaultValue=""
                disabled={loading}
                onChange={(e) => {
                  const currentProject = projects.find((p) => p._id === e.target.value);

                  if (currentProject) {
                    form.setValue('_id', currentProject._id);
                    form.setValue('name', currentProject?.name!);
                    form.setValue('description', currentProject?.description!);
                  }
                }}>
                {projects.map((project) => (
                  <MenuItem key={project.name} value={project._id} selected={form.watch('_id') === project._id}>
                    {project.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <Typography variant="subtitle2">{t('projectSetting.name')}</Typography>
              <TextField
                {...form.register('name')}
                label={t('projectSetting.name')}
                rows={4}
                InputProps={{
                  readOnly: true,
                  onFocus: (e) => (e.currentTarget.readOnly = false),
                }}
                focused
                sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2">{t('projectSetting.description')}</Typography>
              <TextField
                {...form.register('description')}
                label={t('projectSetting.description')}
                multiline
                rows={4}
                InputProps={{
                  readOnly: true,
                  onFocus: (e) => (e.currentTarget.readOnly = false),
                }}
                focused
                sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={cancelImport} className="cancel">
            {t('cancel')}
          </Button>

          <LoadingButton
            className="save"
            variant="contained"
            type="submit"
            loading={form.formState.isSubmitting}
            disabled={!form.watch('name')}
            loadingPosition="start"
            startIcon={<Add />}>
            {t('import.didSpaces')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
