/* eslint-disable consistent-return */
import Project from '@api/store/models/project';
import { useSessionContext } from '@app/contexts/session';
import { didSpaceReady, getImportUrl } from '@app/libs/did-spaces';
import currentGitStore from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import KeyboardArrowRightOutlinedIcon from '@mui/icons-material/KeyboardArrowRightOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useAsyncEffect } from 'ahooks';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { joinURL, withQuery } from 'ufo';

import { useProjectsState } from '../../../contexts/projects';
import { getErrorMessage } from '../../../libs/api';
import Add from '../icons/add';
import Close from '../icons/close';
import DidSpacesLogo from '../icons/did-spaces';

type ProjectSettingForm = {
  _id: string;
  name: string;
  description: string;
};

export function SelectDidSpacesImportWay({ onClose = () => undefined }: { onClose: () => void }) {
  const { t } = useLocaleContext();
  const { session } = useSessionContext();
  const hasDidSpace = didSpaceReady(session.user);

  const fromCurrentDidSpaceImport = useCallback(async () => {
    const importUrl = await getImportUrl(session?.user?.didSpace?.endpoint, { redirectUrl: window.location.href });
    window.location.href = importUrl;
  }, [session?.user?.didSpace?.endpoint]);

  const fromOtherDidSpaceImport = useCallback(() => {
    session.connectToDidSpaceForImport({
      onSuccess: (response: { importUrl: string }, decrypt: (value: string) => string) => {
        const importUrl = decrypt(response.importUrl);
        window.location.href = withQuery(importUrl, {
          redirectUrl: window.location.href,
        });
      },
    });
    onClose();
  }, [session]);

  return (
    <Dialog open disableEnforceFocus maxWidth="sm" fullWidth component="form" onClose={onClose}>
      <DialogTitle className="between">
        <Box>{t('import.didSpacesTitle')}</Box>

        <IconButton size="small" onClick={onClose}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack overflow="auto" gap={1.5}>
          {hasDidSpace && (
            <Box
              sx={{
                display: 'flex',
                backgroundColor: '#F9FAFB',
                '&:hover': {
                  backgroundColor: '#F3F4F6',
                },
                '&:active': {
                  backgroundColor: '#E5E7E8',
                },
                padding: '16px 12px',
                cursor: 'pointer',
                borderRadius: '8px',
              }}>
              <>
                <Typography onClick={fromCurrentDidSpaceImport}>{t('import.fromCurrentDidSpaceImport')}</Typography>
                <KeyboardArrowRightOutlinedIcon sx={{ ml: 0.5 }} />
              </>
            </Box>
          )}

          <Box
            sx={{
              display: 'flex',
              backgroundColor: '#F9FAFB',
              '&:hover': {
                backgroundColor: '#F3F4F6',
              },
              '&:active': {
                backgroundColor: '#E5E7E8',
              },
              padding: '16px 12px',
              cursor: 'pointer',
              borderRadius: '8px',
            }}>
            <Typography onClick={fromOtherDidSpaceImport}>{t('import.fromOtherDidSpaceImport')}</Typography>
            <LinkOutlinedIcon sx={{ ml: 0.5 }} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} className="cancel" variant="outlined">
          {t('cancel')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function FromDidSpacesImport() {
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

  if (!didSpaceReady(session?.user)) {
    return null;
  }

  return (
    <>
      <MenuItem onClick={goToDidSpacesImport}>
        <DidSpacesLogo sx={{ mr: 1, fontSize: 14 }} />
        <ListItemText sx={{ fontSize: 13, lineHeight: '22px' }}>{t('didSpaces.title')}</ListItemText>
      </MenuItem>

      <Dialog
        {...bindDialog(dialogState)}
        open
        maxWidth="sm"
        fullWidth
        component="form"
        onSubmit={form.handleSubmit(importProject)}>
        <DialogTitle className="between">
          <Box>{t('import.didSpacesTitle')}</Box>

          <IconButton size="small" onClick={cancelImport}>
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
          <Button onClick={cancelImport} className="cancel" variant="outlined">
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
