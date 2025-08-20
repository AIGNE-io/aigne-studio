/* eslint-disable consistent-return */
import Project from '@api/store/models/project';
import { useSessionContext } from '@app/contexts/session';
import { didSpaceReady, getImportUrl } from '@app/libs/did-spaces';
import { checkErrorType } from '@app/libs/util';
import currentGitStore from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { getWalletDid } from '@arcblock/ux/lib/SessionUser/libs/utils';
import Toast from '@arcblock/ux/lib/Toast';
import { RuntimeErrorType } from '@blocklet/ai-runtime/types/runtime/error';
import { Icon } from '@iconify-icon/react';
import ArrowRightAltRoundedIcon from '@iconify-icons/material-symbols/arrow-right-alt-rounded';
import PlusIcon from '@iconify-icons/tabler/plus';
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
  Button as LoadingButton,
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
import Close from '../icons/close';
import DidSpacesLogo from '../icons/did-spaces';
import NameField from './components/name-field';

type ProjectSettingForm = {
  id: string;
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
        backgroundColor: 'grey.50',
        p: 2,
        transition: 'background-color 0.5s',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'grey.100',
          '& .other-item-icon': {
            display: 'inline-flex',
            transform: 'translateX(0)',
            opacity: '1',
            flexShrink: 0,
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
      <Box
        component={Icon}
        icon={ArrowRightAltRoundedIcon}
        className="other-item-icon"
        sx={{
          fontSize: '1.3rem',
          color: 'info.main',
        }}
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

    // @note: 不管有没有绑定钱包，都直接跳转导入页面
    await goToImport();
    customOnClose();
  }, [customOnClose, session?.user?.didSpace?.endpoint]);

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
        <Stack
          sx={{
            overflow: 'auto',
            gap: 1.5,
          }}>
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
  const { listProjectsByDidSpaces, fromDidSpacesImport, createLimitDialog } = useProjectsState();
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
      const message = getErrorMessage(error);
      if (checkErrorType(error, RuntimeErrorType.ProjectLimitExceededError)) {
        createLimitDialog();
      } else {
        Toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const form = useForm<ProjectSettingForm>({
    defaultValues: { id: '', name: '', description: '' },
  });

  const importProject = useCallback(
    async (value: ProjectSettingForm) => {
      try {
        if (!value.id) {
          return null;
        }

        const project = await fromDidSpacesImport({
          endpoint: endpoint!,
          projectId: value.id,
          props: {
            name: value.name,
            description: value.description,
          },
        });

        currentGitStore.setState({
          currentProjectId: project.id,
        });
        dialogState.close();
        form.reset(value);

        navigate(joinURL('/projects', project.id));
      } catch (error) {
        form.reset(value);
        const message = getErrorMessage(error);
        if (error.type === RuntimeErrorType.ProjectLimitExceededError) {
          createLimitDialog();
        } else {
          Toast.error(message);
        }
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
        maxWidth="sm"
        fullWidth
        component="form"
        onSubmit={form.handleSubmit(importProject)}
        onClose={cancelImport}>
        <DialogTitle className="between">
          <Box>{t('import.didSpacesTitle')}</Box>

          <IconButton size="small" onClick={cancelImport}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack
            sx={{
              gap: 2,
            }}>
            <Box>
              <Typography variant="subtitle2">{t('projectSetting.selectProject')}</Typography>
              <TextField
                placeholder={t('selectProjectToImportPlaceholder')}
                sx={{ width: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
                {...form.register('id', { required: true })}
                select
                hiddenLabel
                defaultValue=""
                disabled={loading}
                onChange={(e) => {
                  const currentProject = projects.find((p) => p.id === e.target.value);

                  if (currentProject) {
                    form.setValue('id', currentProject.id);
                    form.setValue('name', currentProject?.name!);
                    form.setValue('description', currentProject?.description!);
                  }
                }}>
                {projects.map((project) => (
                  <MenuItem key={project.name} value={project.id} selected={form.watch('id') === project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            <Box>
              <Typography variant="subtitle2">{t('name')}</Typography>
              <NameField form={form} beforeDuplicateProjectNavigate={() => dialogState.close()} />
            </Box>

            <Box>
              <Typography variant="subtitle2">{t('projectSetting.description')}</Typography>
              <TextField
                {...form.register('description')}
                hiddenLabel
                placeholder={t('newProjectDescriptionPlaceholder')}
                multiline
                rows={4}
                focused
                sx={{ width: 1, border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}
                slotProps={{
                  input: {
                    readOnly: true,
                    onFocus: (e) => (e.currentTarget.readOnly = false),
                  },
                }}
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
            startIcon={<Box component={Icon} icon={PlusIcon} />}>
            {t('import.didSpaces')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
