import { getDefaultBranch } from '@app/store/current-git-store';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Toast from '@arcblock/ux/lib/Toast';
import { CheckCircleOutlineRounded, ErrorOutlineRounded, SaveRounded, SyncRounded } from '@mui/icons-material';
import { Button as LoadingButton } from '@mui/material';
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import gitUrlParse from 'git-url-parse';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';

import Switch from '../../../components/custom/switch';
import PromiseLoadingButton from '../../../components/promise-loading-button';
import { getErrorMessage } from '../../../libs/api';
import Eye from '../icons/eye';
import EyeNo from '../icons/eye-no';
import {
  isTheErrorShouldShowMergeConflict,
  isTheErrorUnauthorizedAccessToken,
  useMergeConflictDialog,
  useUnauthorizedDialog,
} from '../save-button';
import { useAssistantChangesState, useProjectState } from '../state';

interface RemoteRepoSettingForm {
  url: string;
  username: string;
  password: string;
}

export default function RemoteRepoSetting({ projectId, gitRef }: { projectId: string; gitRef: string }) {
  const { t, locale } = useLocaleContext();
  const isMultiTenant = window.blocklet?.tenantMode === 'multiple';

  const { dialog: confirmDialog, showDialog: showConfirmDialog } = useDialog();

  const { dialog, showMergeConflictDialog } = useMergeConflictDialog({ projectId });
  const { dialog: unauthorizedDialog, showUnauthorizedDialog } = useUnauthorizedDialog({ projectId });

  const { state, addRemote, deleteProjectRemote, updateProject, sync } = useProjectState(projectId, getDefaultBranch());
  const { disabled: disabledButton } = useAssistantChangesState(projectId, gitRef);
  const [authSyncUpdating, setAutoSyncUpdating] = useState<boolean | 'success' | 'error'>(false);

  const [checked, setChecked] = useState(false);

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
      } catch (error) {
        form.reset(value);

        if (isTheErrorUnauthorizedAccessToken(error)) {
          Toast.warning(t('remoteGitRepoUnauthorizedToast'));
          return;
        }

        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [addRemote, form, projectId]
  );

  return (
    <Box>
      {/* collapse收起的同时有保存giturl */}
      <Stack sx={{ display: !checked && state?.project?.gitUrl ? 'flex' : 'none' }}>
        <Typography variant="subtitle2">{t('remoteGitRepo')}</Typography>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            gap: 1,
          }}>
          {state?.project?.gitUrl && (
            <Tooltip title={state?.project?.gitUrl} placement="top" disableInteractive>
              <Typography className="ellipsis">{state?.project?.gitUrl}</Typography>
            </Tooltip>
          )}
          <Button
            disabled={isMultiTenant}
            variant="contained"
            size="small"
            sx={{ padding: '2px' }}
            onClick={() => setChecked(!checked)}>
            {t('setting')}
          </Button>
        </Stack>
      </Stack>
      <Collapse orientation="vertical" in={checked || !state?.project?.gitUrl} collapsedSize={0}>
        <Stack
          sx={{
            gap: 2,
          }}>
          {confirmDialog}
          {dialog}
          {unauthorizedDialog}
          <>
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 0.5,
                }}>
                {`${t('url')}*`}
              </Typography>

              <TextField
                disabled={isMultiTenant}
                autoFocus
                fullWidth
                label={`${t('url')}*`}
                onPaste={(e) => {
                  try {
                    const url = gitUrlParse(e.clipboardData.getData('text/plain'));
                    const https = gitUrlParse.stringify(url, 'https');
                    form.setValue('url', https, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                    form.setValue('username', url.owner, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });

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
                error={Boolean(form.formState.errors.url)}
                helperText={form.formState.errors.url?.message}
                slotProps={{
                  inputLabel: { shrink: form.watch('url') ? true : undefined },
                }}
              />
            </Box>

            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 0.5,
                }}>
                {t('username')}
              </Typography>

              <TextField
                disabled={isMultiTenant}
                fullWidth
                label={t('username')}
                {...form.register('username')}
                error={Boolean(form.formState.errors.username)}
                helperText={form.formState.errors.username?.message}
                slotProps={{
                  inputLabel: { shrink: form.watch('username') ? true : undefined },
                }}
              />
            </Box>

            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 0.5,
                }}>
                {t('accessToken')}
              </Typography>

              <TextField
                disabled={isMultiTenant}
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
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <EyeNo /> : <Eye />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },

                  inputLabel: { shrink: form.watch('password') ? true : undefined },
                }}
              />
            </Box>
          </>

          <Stack
            sx={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 1,
              whiteSpace: 'nowrap',
            }}>
            <Stack
              sx={{
                flexDirection: 'row',
                gap: 1,
              }}>
              <LoadingButton
                disabled={isMultiTenant}
                variant="contained"
                loading={form.formState.isSubmitting}
                loadingPosition="start"
                startIcon={<SaveRounded />}
                onClick={form.handleSubmit(saveSetting)}>
                {t('save')}
              </LoadingButton>

              {state.project && state.project.gitUrl ? (
                <Button
                  disabled={isMultiTenant}
                  sx={{ background: '#E11D48' }}
                  variant="contained"
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
                  {t('delete')}
                </Button>
              ) : null}
            </Stack>
          </Stack>
          {state.project && state.project.gitUrl ? (
            <Tooltip title={!disabledButton ? t('syncTip') : undefined}>
              <Stack
                sx={{
                  flexDirection: 'row',
                  gap: 1,
                  flexWrap: 'wrap',
                }}>
                <Stack
                  direction="row"
                  sx={{
                    alignItems: 'center',
                    gap: 1,
                  }}>
                  <FormControlLabel
                    sx={{ m: 0, lineHeight: 1 }}
                    label={t('autoSync')}
                    labelPlacement="end"
                    slotProps={{ typography: { sx: { ml: 1 } } }}
                    control={
                      <Switch
                        disabled={isMultiTenant}
                        defaultChecked={state.project?.gitAutoSync ?? false}
                        onChange={(_, checked) => changeAutoSync(checked)}
                      />
                    }
                  />

                  {authSyncUpdating ? (
                    <Stack
                      sx={{
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: 24,
                        height: 24,
                      }}>
                      {authSyncUpdating === true ? (
                        <CircularProgress size={16} />
                      ) : authSyncUpdating === 'success' ? (
                        <CheckCircleOutlineRounded color="success" sx={{ fontSize: 20 }} />
                      ) : authSyncUpdating === 'error' ? (
                        <ErrorOutlineRounded color="error" sx={{ fontSize: 20 }} />
                      ) : null}
                    </Stack>
                  ) : null}
                </Stack>

                <Stack
                  direction="row"
                  sx={{
                    alignItems: 'center',
                    gap: 1,
                  }}>
                  <PromiseLoadingButton
                    size="small"
                    variant="text"
                    loadingPosition="start"
                    startIcon={<SyncRounded />}
                    disabled={!disabledButton || isMultiTenant}
                    onClick={async () => {
                      try {
                        await sync(projectId);
                        Toast.success(t('synced'));
                      } catch (error) {
                        if (isTheErrorShouldShowMergeConflict(error)) {
                          showMergeConflictDialog();
                          return;
                        }

                        if (isTheErrorUnauthorizedAccessToken(error)) {
                          showUnauthorizedDialog();
                          return;
                        }

                        Toast.error(getErrorMessage(error));
                      }
                    }}>
                    {t('sync')}
                  </PromiseLoadingButton>

                  {state.project?.gitLastSyncedAt && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#9CA3AF',
                      }}>
                      {/* @ts-ignore */}
                      <RelativeTime locale={locale} value={state.project.gitLastSyncedAt} />
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Tooltip>
          ) : null}
        </Stack>
      </Collapse>
    </Box>
  );
}
