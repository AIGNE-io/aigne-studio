/* eslint-disable consistent-return */
import Project from '@api/store/models/project';
import { useSessionContext } from '@app/contexts/session';
import { didSpaceReady, getImportUrl } from '@app/libs/did-spaces';
import currentGitStore from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { getWalletDid } from '@arcblock/ux/lib/SessionUser/libs/utils';
import Toast from '@arcblock/ux/lib/Toast';
import ArrowRightAltRoundedIcon from '@iconify-icons/material-symbols/arrow-right-alt-rounded';
import { Icon } from '@iconify/react';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  BoxProps,
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
import { ReactNode, useCallback, useId, useState } from 'react';
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

function ImportWayItem({
  icon,
  text,
  ...rest
}: {
  icon: ReactNode;
  text: string;
} & BoxProps) {
  return (
    <Box
      {...rest}
      sx={{
        borderRadius: 2,
        backgroundColor: 'rgba(249, 250, 251, 1)',
        p: 2,
        transition: 'background-color 0.5s',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'rgba(19, 125, 250, 0.06)',
          '& .other-item-icon': {
            display: 'inline-block',
            transform: 'translateX(0)',
            opacity: '1',
          },
        },
        '& .other-item-icon': {
          opacity: '0',
          transform: 'translateX(-100%)',
          transition: 'transform 0.2s ease',
        },
        ...rest?.sx,
      }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon}
        <Typography sx={{ fontSize: '16px' }}>{text}</Typography>
      </Box>
      <Icon
        className="other-item-icon"
        icon={ArrowRightAltRoundedIcon}
        fontSize="1.3rem"
        color="rgba(19, 125, 250, 1)"
      />
    </Box>
  );
}

export const FROM_DID_SPACES_IMPORT = 'from-did-spaces-import';
export function SelectDidSpacesImportWay({ onClose = () => undefined }: { onClose?: () => void }) {
  const { t } = useLocaleContext();
  const { session, connectApi } = useSessionContext();
  const hasDidSpace = didSpaceReady(session.user);
  const useDidWallet = !!getWalletDid(session.user);
  const [searchParams, setSearchParams] = useSearchParams();

  const customOnClose = useCallback(() => {
    if (searchParams.has('action')) {
      searchParams.delete('action');
      setSearchParams(searchParams);
    }
    onClose();
  }, [onClose, searchParams, setSearchParams]);

  const requireBindWallet = useCallback(() => {
    connectApi.open({
      prefix: joinURL(window.location.origin, '/.well-known/service/api/did'),
      action: 'bind-wallet',
      messages: {
        title: t('import.bindWallet.title'),
        scan: t('import.bindWallet.scan'),
        confirm: t('import.bindWallet.confirm'),
        success: t('import.bindWallet.success'),
      },
      extraParams: {
        previousUserDid: session?.user?.did,
      },
      onSuccess: async () => {
        window.location.href = withQuery(window.location.href, {
          action: FROM_DID_SPACES_IMPORT,
        });
      },
    });
  }, [connectApi, session?.user?.did, t]);

  const fromCurrentDidSpaceImport = useCallback(async () => {
    const goToImport = async () => {
      const importUrl = await getImportUrl(session?.user?.didSpace?.endpoint, { redirectUrl: window.location.href });
      window.location.href = importUrl;
    };

    customOnClose();
    if (useDidWallet) {
      await goToImport();
    } else {
      requireBindWallet();
    }
  }, [customOnClose, requireBindWallet, session?.user?.didSpace?.endpoint, useDidWallet]);

  const fromOtherDidSpaceImport = useCallback(() => {
    const goToImport = () => {
      session.connectToDidSpaceForImport({
        onSuccess: (response: { importUrl: string }, decrypt: (value: string) => string) => {
          const importUrl = decrypt(response.importUrl);
          window.location.href = withQuery(importUrl, {
            redirectUrl: window.location.href,
          });
        },
      });
    };

    customOnClose();
    if (useDidWallet) {
      goToImport();
    } else {
      requireBindWallet();
    }
  }, [customOnClose, requireBindWallet, session, useDidWallet]);

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
            <ImportWayItem
              icon={<DidSpacesLogo style={{ transform: 'scale(0.95)', fontSize: '1.5rem' }} />}
              text={t('import.fromCurrentDidSpaceImport', { name: session?.user?.didSpace?.name })}
              onClick={fromCurrentDidSpaceImport}
            />
          )}
          <ImportWayItem
            icon={<DidSpacesLogo style={{ transform: 'scale(0.95)', fontSize: '1.5rem' }} />}
            text={t('import.fromOtherDidSpaceImport')}
            onClick={fromOtherDidSpaceImport}
          />
        </Stack>
      </DialogContent>
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
        dialogState.close();
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
