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
  Stack,
  TextField,
  Tooltip,
  styled,
} from '@mui/material';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useEffect, useId } from 'react';
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

export default function ImportFromDIDSpaces() {
  const { t } = useLocaleContext();
  const [search] = useSearchParams();
  const endpoint = search.get('endpoint');
  const id = useId();
  const navigate = useNavigate();
  const dialogState = usePopupState({ variant: 'dialog', popupId: id });
  const { importProject } = useProjectsState();

  useEffect(() => {
    if (endpoint) {
      dialogState.open();
    }
  }, [endpoint]);

  const form = useForm<RemoteRepoSettingForm>({
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const saveSetting = useCallback(
    async (value: RemoteRepoSettingForm) => {
      try {
        const project = await importProject({} as any);
        form.reset(value);

        currentGitStore.setState({
          currentProjectId: project._id,
        });

        dialogState.close();
        navigate(joinURL('/projects', project._id!));
      } catch (error) {
        form.reset(value);
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [dialogState, form, importProject, navigate]
  );

  const fromDidSpacesImport = () => {
    window.location.href = joinURL(window.origin, window.blocklet?.prefix ?? '/', 'api/import/from-did-spaces');
  };

  return (
    <>
      <Tooltip title={t('import.didSpaces')}>
        <ProjectItemRoot onClick={fromDidSpacesImport} justifyContent="center" alignItems="center">
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
        onSubmit={form.handleSubmit(saveSetting)}>
        <DialogTitle>{t('remoteGitRepo')}</DialogTitle>
        <DialogContent>
          <Stack gap={2}>
            <TextField
              label={t('projectSetting.name')}
              sx={{ width: 1 }}
              {...form.register('name')}
              InputProps={{
                readOnly: true,
                onFocus: (e) => (e.currentTarget.readOnly = false),
              }}
              InputLabelProps={{ shrink: form.watch('name') ? true : undefined }}
            />

            <TextField
              label={t('projectSetting.description')}
              multiline
              rows={4}
              sx={{ width: 1 }}
              {...form.register('description')}
              InputProps={{
                readOnly: true,
                onFocus: (e) => (e.currentTarget.readOnly = false),
              }}
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
