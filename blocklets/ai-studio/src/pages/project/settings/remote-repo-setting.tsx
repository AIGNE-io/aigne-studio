import currentGitStore from '@app/store/current-git-store';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Toast from '@arcblock/ux/lib/Toast';
import { CheckCircleOutlineRounded, ErrorOutlineRounded, SaveRounded, SyncRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import gitUrlParse from 'git-url-parse';
import { bindDialog, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import PromiseLoadingButton from '../../../components/promise-loading-button';
import { getErrorMessage } from '../../../libs/api';
import Delete from '../icons/delete';
import Eye from '../icons/eye';
import EyeNo from '../icons/eye-no';
import Pen from '../icons/pen';
import { isTheErrorShouldShowMergeConflict, useMergeConflictDialog } from '../save-button';
import { useProjectState } from '../state';

interface RemoteRepoSettingForm {
  url: string;
  username: string;
  password: string;
}

export default function RemoteRepoSetting({ projectId }: { projectId: string }) {
  const { t, locale } = useLocaleContext();

  const { dialog: confirmDialog, showDialog: showConfirmDialog } = useDialog();

  const { dialog, showMergeConflictDialog } = useMergeConflictDialog({ projectId });

  const { state, addRemote, deleteProjectRemote, updateProject, sync } = useProjectState(
    projectId,
    currentGitStore.getState().defaultBranch
  );
  const dialogState = usePopupState({ variant: 'dialog' });

  const [authSyncUpdating, setAutoSyncUpdating] = useState<boolean | 'success' | 'error'>(false);

  const changeAutoSync = useCallback(
    async (gitAutoSync: boolean) => {
      setAutoSyncUpdating(true);
      try {
        await updateProject(projectId, { gitAutoSync });
        setAutoSyncUpdating('success');
      } catch (error) {
        setAutoSyncUpdating('error');
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [projectId, updateProject]
  );

  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RemoteRepoSettingForm>({
    defaultValues: async () => {
      const gitUrl = state.project?.gitUrl;
      let url = '';
      let username = '';
      try {
        if (gitUrl) {
          const u = new URL(gitUrl);
          username = u.username || '';
          u.username = '';
          url = u.toString();
        }
      } catch {
        // empty
      }

      return { url, username, password: '' };
    },
  });

  const saveSetting = useCallback(
    async (value: RemoteRepoSettingForm) => {
      try {
        await addRemote(projectId, value);
        dialogState.close();
      } catch (error) {
        form.reset(value);
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [addRemote, dialogState, form, projectId]
  );

  return (
    <Stack gap={1}>
      {confirmDialog}
      {dialog}

      <Stack direction="row" alignItems="center" gap={1}>
        <TextField
          hiddenLabel
          placeholder={t('url')}
          fullWidth
          value={state.project?.gitUrl || ''}
          InputProps={{ readOnly: true }}
        />

        <IconButton size="small" {...bindTrigger(dialogState)}>
          <Pen />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => {
            showConfirmDialog({
              fullWidth: true,
              maxWidth: 'sm',
              title: t('deleteRemote'),
              content: t('deleteRemoteTip'),
              okColor: 'error',
              okText: t('delete'),
              cancelText: t('cancel'),
              onOk: async () => {
                try {
                  await deleteProjectRemote(projectId);
                  Toast.success(t('deleteSucceed'));
                } catch (error) {
                  Toast.error(getErrorMessage(error));
                  throw error;
                }
              },
            });
          }}>
          <Delete fontSize="small" />
        </IconButton>
      </Stack>

      {state.project && state.project.gitUrl ? (
        <>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
            <FormControlLabel
              label={t('autoSync')}
              labelPlacement="start"
              slotProps={{ typography: { sx: { mr: 2 } } }}
              control={
                <Switch
                  defaultChecked={state.project.gitAutoSync ?? false}
                  onChange={(_, checked) => changeAutoSync(checked)}
                />
              }
            />

            <Stack justifyContent="center" alignItems="center" width={24} height={24}>
              {authSyncUpdating === true ? (
                <CircularProgress size={20} />
              ) : authSyncUpdating === 'success' ? (
                <CheckCircleOutlineRounded color="success" sx={{ fontSize: 24 }} />
              ) : authSyncUpdating === 'error' ? (
                <ErrorOutlineRounded color="error" sx={{ fontSize: 24 }} />
              ) : null}
            </Stack>
          </Stack>

          <Stack direction="row" alignItems="center" gap={1}>
            <PromiseLoadingButton
              size="small"
              variant="outlined"
              loadingPosition="start"
              startIcon={<SyncRounded />}
              onClick={async () => {
                try {
                  await sync(projectId);
                  Toast.success(t('synced'));
                } catch (error) {
                  if (isTheErrorShouldShowMergeConflict(error)) {
                    showMergeConflictDialog();
                    return;
                  }
                  Toast.error(getErrorMessage(error));
                  throw error;
                }
              }}>
              {t('sync')}
            </PromiseLoadingButton>

            {state.project.gitLastSyncedAt && (
              <Typography variant="caption" color="text.secondary">
                {t('syncedAt')}: <RelativeTime locale={locale} value={state.project.gitLastSyncedAt} />
              </Typography>
            )}
          </Stack>
        </>
      ) : null}

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
              autoFocus
              fullWidth
              label={`${t('url')}*`}
              onPaste={(e) => {
                try {
                  const url = gitUrlParse(e.clipboardData.getData('text/plain'));
                  const https = gitUrlParse.stringify(url, 'https');
                  form.setValue('url', https, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                  form.setValue('username', url.owner, { shouldValidate: true, shouldDirty: true, shouldTouch: true });

                  const { password } = url as any;
                  if (password && typeof password === 'string') {
                    form.setValue('password', password, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }
                  e.preventDefault();
                } catch {
                  // empty
                }
              }}
              {...form.register('url', {
                required: true,
                validate: (value) =>
                  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/.test(
                    value
                  ) || t('validation.urlPattern'),
              })}
              InputLabelProps={{ shrink: form.watch('url') ? true : undefined }}
              error={Boolean(form.formState.errors.url)}
              helperText={form.formState.errors.url?.message}
            />

            <TextField
              fullWidth
              label={t('username')}
              {...form.register('username')}
              error={Boolean(form.formState.errors.username)}
              helperText={form.formState.errors.username?.message}
              InputLabelProps={{ shrink: form.watch('username') ? true : undefined }}
            />

            <TextField
              fullWidth
              label={t('accessToken')}
              {...form.register('password')}
              error={Boolean(form.formState.errors.password)}
              helperText={
                form.formState.errors.password?.message || (
                  <Box component="span">
                    {t('remoteGitRepoPasswordHelper')}{' '}
                    <Tooltip
                      title={t('githubTokenTip')}
                      placement="top"
                      slotProps={{ popper: { sx: { whiteSpace: 'pre-wrap' } } }}>
                      <Link href="https://github.com/settings/tokens?type=beta" target="_blank">
                        github access token
                      </Link>
                    </Tooltip>
                  </Box>
                )
              }
              type={showPassword ? 'text' : 'password'}
              InputLabelProps={{ shrink: form.watch('password') ? true : undefined }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <EyeNo /> : <Eye />}
                    </IconButton>
                  </InputAdornment>
                ),
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
            startIcon={<SaveRounded />}>
            {t('save')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
