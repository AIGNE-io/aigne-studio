import { EVENTS } from '@api/event';
import useSubscription from '@app/hooks/use-subscription';
import { getProjectDataUrlInSpace } from '@app/libs/did-spaces';
import { getDefaultBranch, useCurrentGitStore } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import FloppyIcon from '@iconify-icons/tabler/device-floppy';
import { DownloadRounded, SyncRounded, UploadRounded, WarningRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useKeyPress } from 'ahooks';
import gitUrlParse from 'git-url-parse';
import { PopupState, bindDialog, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, FormProvider, UseFormReturn, useForm, useFormContext } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useReadOnly, useSessionContext } from '../../contexts/session';
import { getErrorMessage } from '../../libs/api';
import { commitFromWorking } from '../../libs/working';
import useDialog from '../../utils/use-dialog';
import Eye from './icons/eye';
import EyeNo from './icons/eye-no';
import { saveButtonState, useAssistantChangesState, useProjectState } from './state';

export interface CommitForm {
  skipCommitIfNoChanges?: boolean;
  branch: string;
  message: string;
}

export default function SaveButton({
  projectId,
  gitRef,
  disabled,
}: {
  projectId: string;
  gitRef: string;
  disabled?: boolean;
}) {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog' });
  const [githubLoading, setGithubLoading] = useState(false);
  const [didSpaceLoading, setDidSpaceLoading] = useState(false);

  const { disabled: disabledButton } = useAssistantChangesState(projectId, gitRef);
  const form = useForm<CommitForm>({});
  const submitting = form.formState.isSubmitting || githubLoading || didSpaceLoading;

  return (
    <>
      <Tooltip disableInteractive title={t('save')}>
        <span>
          <Button
            data-testid="save-button"
            {...bindTrigger(dialogState)}
            disabled={disabled ?? (submitting || disabledButton)}
            sx={{
              position: 'relative',
              minWidth: 0,
              minHeight: 0,
              width: 32,
              height: 32,
              border: '1px solid #E5E7EB',
              color: '#030712',
            }}>
            <Box
              component={Icon}
              icon={FloppyIcon}
              sx={{ opacity: submitting ? 0 : 1, fontSize: 20, color: 'inherit' }}
            />
            {submitting && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <CircularProgress size={20} />
              </Box>
            )}
          </Button>
        </span>
      </Tooltip>

      <SaveButtonDialog
        projectId={projectId}
        gitRef={gitRef}
        dialogState={dialogState}
        setGithubLoading={setGithubLoading}
        setDidSpaceLoading={setDidSpaceLoading}
        form={form}
      />
    </>
  );
}

export function SaveButtonDialog({
  projectId,
  gitRef,
  dialogState,
  setGithubLoading,
  setDidSpaceLoading,
  form,
  dialogProps,
  dialogContent,
}: {
  projectId: string;
  gitRef: string;
  dialogState: PopupState;
  setGithubLoading: (data: any) => void;
  setDidSpaceLoading: (data: any) => void;
  form: UseFormReturn<CommitForm, any, undefined>;
  dialogProps?: Omit<DialogProps, 'open'>;
  dialogContent?: any;
}) {
  const { t } = useLocaleContext();
  const { session } = useSessionContext();
  const navigate = useNavigate();

  const { dialog, showMergeConflictDialog } = useMergeConflictDialog({ projectId });
  const { dialog: unauthorizedDialog, showUnauthorizedDialog } = useUnauthorizedDialog({ projectId });

  const setProjectCurrentBranch = useCurrentGitStore((i) => i.setProjectCurrentBranch);

  const {
    state: { branches, project },
    refetch,
  } = useProjectState(projectId, gitRef);
  const { run } = useAssistantChangesState(projectId, gitRef);

  const simpleMode = !project || project?.gitType === 'simple';

  useEffect(() => {
    if (dialogState.isOpen) form.reset();
    if (branches.includes(gitRef)) {
      form.setValue('branch', gitRef);
    }

    if (!dialogState.isOpen) {
      savePromise.current?.resolve({ saved: false });
    }
  }, [dialogState.isOpen]);

  const branch = form.getValues('branch');
  const readOnly = useReadOnly({ ref: branch });

  const onSave = useCallback(
    async (input: CommitForm, { skipToast }: { skipToast?: boolean } = {}) => {
      try {
        let needMergeConflict = false;
        let needUpdateAccessToken = false;

        const branch = simpleMode ? getDefaultBranch() : input.branch;
        try {
          await commitFromWorking({
            projectId,
            ref: gitRef,
            input: {
              ...input,
              branch,
              message: input.message || new Date().toLocaleString(),
            },
          });
        } catch (error) {
          needMergeConflict = isTheErrorShouldShowMergeConflict(error);
          needUpdateAccessToken = isTheErrorUnauthorizedAccessToken(error);
          if (!needMergeConflict && !needUpdateAccessToken) throw error;
        }

        dialogState.close();

        if (needMergeConflict) {
          Toast.warning(t('alert.savedButSyncConflicted'));
          await showMergeConflictDialog();
        } else if (needUpdateAccessToken) {
          Toast.warning(t('remoteGitRepoUnauthorizedToast'));
          await showUnauthorizedDialog();
        } else if (!skipToast) Toast.success(t('alert.saved'));

        refetch();
        run();
        setProjectCurrentBranch(projectId, branch);
        if (branch !== gitRef) navigate(joinURL('..', branch), { replace: true });
        savePromise.current?.resolve?.({ saved: true });
      } catch (error) {
        form.reset(input);
        Toast.error(getErrorMessage(error));
        savePromise.current?.reject?.(error);
        throw error;
      }
    },
    [
      simpleMode,
      dialogState,
      refetch,
      run,
      setProjectCurrentBranch,
      projectId,
      gitRef,
      navigate,
      t,
      showMergeConflictDialog,
      form,
    ]
  );

  useKeyPress(
    (e) => (e.ctrlKey || e.metaKey) && e.key === 's',
    (e) => {
      e.preventDefault();
      dialogState.open();
    }
  );

  const savePromise = useRef<{ resolve: (result: { saved?: boolean }) => void; reject: (error: Error) => void }>();

  useEffect(() => {
    saveButtonState.getState().setSaveHandler(async (options) => {
      if (options?.skipConfirm) {
        return onSave(
          { branch: gitRef, message: '', skipCommitIfNoChanges: options.skipCommitIfNoChanges },
          { skipToast: true }
        ).then(() => ({ saved: true }));
      }
      return new Promise<{ saved?: boolean } | undefined>((resolve, reject) => {
        savePromise.current = { resolve, reject };
        dialogState.open();
      });
    });
    return () => saveButtonState.getState().setSaveHandler(undefined);
  }, [dialogState.open, onSave, gitRef]);

  const sub = useSubscription(projectId);
  useEffect(() => {
    const eventCallback = async (
      data: { response: { done: boolean; error: Error } },
      options: {
        name: string;
        setLoading: (data: boolean) => void;
      }
    ) => {
      const done = data.response?.done;
      options.setLoading(!done);

      if (!done) return;

      if (data.response.error) {
        Toast.error(data.response.error.message);
      } else {
        refetch();

        if (options.name === 'DID Space') {
          const href = await getProjectDataUrlInSpace(session?.user?.didSpace?.endpoint, projectId);
          Toast.success(`${options.name} ${t('synced')}`, {
            action: () => {
              return (
                <Button
                  variant="outlined"
                  href={href}
                  component="a"
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  sx={{ color: 'white' }}>
                  {/* @ts-ignore */}
                  {t('viewData')}
                </Button>
              );
            },
          });
        } else {
          Toast.success(`${options.name} ${t('synced')}`);
        }
      }
    };

    const DIDSpaceFn = (data: { response: { done: boolean; error: Error } }) =>
      eventCallback(data, { name: 'DID Space', setLoading: setDidSpaceLoading });
    const githubFn = (data: { response: { done: boolean; error: Error } }) =>
      eventCallback(data, { name: 'GitHub', setLoading: setGithubLoading });

    if (sub) {
      sub.on(EVENTS.PROJECT.SYNC_TO_DID_SPACE, DIDSpaceFn);
      sub.on(EVENTS.PROJECT.SYNC_TO_GIT, githubFn);
    }

    return () => {
      if (sub) {
        sub.off(EVENTS.PROJECT.SYNC_TO_DID_SPACE, DIDSpaceFn);
        sub.off(EVENTS.PROJECT.SYNC_TO_GIT, githubFn);
      }
    };
  }, [sub]);

  return (
    <>
      {dialog}
      {unauthorizedDialog}

      <Dialog
        {...bindDialog(dialogState)}
        keepMounted={false}
        component="form"
        onSubmit={form.handleSubmit((values) => onSave(values))}
        maxWidth="sm"
        fullWidth
        {...(dialogProps || {})}>
        <DialogTitle>{t('save')}</DialogTitle>
        <DialogContent>
          {dialogContent || null}

          <Stack gap={1}>
            {!simpleMode && (
              <Box>
                <Controller
                  control={form.control}
                  name="branch"
                  render={({ field }) => (
                    <Autocomplete
                      disableClearable
                      freeSolo
                      autoSelect
                      options={branches}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={t('branch')}
                          error={Boolean(form.formState.errors.branch)}
                          helperText={form.formState.errors.branch?.message}
                        />
                      )}
                      {...form.register('branch', { required: true, maxLength: 50, pattern: /^\S+$/ })}
                      value={field.value ?? ''}
                      onChange={(_, branch) =>
                        form.setValue('branch', branch, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
                      }
                    />
                  )}
                />
              </Box>
            )}

            <Box>
              <TextField
                label={t('commitMessage')}
                fullWidth
                multiline
                minRows={1}
                error={Boolean(form.formState.errors.message)}
                helperText={form.formState.errors.branch?.message}
                {...form.register('message', { maxLength: 100 })}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={dialogState.close} variant="outlined">
            {t('cancel')}
          </Button>
          <Tooltip title={readOnly ? t('noPermissionSaveToBranch', { branch }) : ''} placement="top">
            <span>
              <LoadingButton
                disabled={readOnly}
                type="submit"
                variant="contained"
                startIcon={<Box component={Icon} icon={FloppyIcon} sx={{ fontSize: 20, color: '#fff' }} />}
                loadingPosition="start"
                loading={form.formState.isSubmitting}>
                {t('save')}
              </LoadingButton>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function isTheErrorShouldShowMergeConflict(error: any) {
  const errorName = error.response?.data?.error?.name;
  return ['MergeConflictError', 'PushRejectedError', 'MergeNotSupportedError'].includes(errorName);
}

export function isTheErrorUnauthorizedAccessToken(error: any) {
  const errorName = error.response?.data?.error?.message;
  return errorName.includes('401 Unauthorized');
}

export function useMergeConflictDialog({ projectId }: { projectId: string }) {
  const { t } = useLocaleContext();
  const { dialog, showDialog } = useDialog();

  const { push, pull } = useProjectState(projectId, getDefaultBranch());

  const showMergeConflictDialog = useCallback(async () => {
    return new Promise<void>((resolve) => {
      showDialog({
        fullWidth: true,
        maxWidth: 'sm',
        title: (
          <Stack direction="row" alignItems="center" gap={1}>
            <WarningRounded color="warning" fontSize="large" /> {t('mergeConflict')}
          </Stack>
        ),

        content: (
          <Stack gap={0.25} sx={{ b: { color: 'warning.main', mx: 0.25 } }}>
            <Typography variant="subtitle2">{t('mergeConflictTip')}</Typography>
            <Box>
              <Typography component="span" fontWeight="bold">
                {t('useRemote')}:{' '}
              </Typography>
              <Typography component="span" dangerouslySetInnerHTML={{ __html: t('useRemoteTip') }} />
            </Box>
            <Box>
              <Typography component="span" fontWeight="bold">
                {t('useLocal')}:{' '}
              </Typography>
              <Typography component="span" dangerouslySetInnerHTML={{ __html: t('useLocalTip') }} />
            </Box>
          </Stack>
        ),
        cancelText: t('cancel'),
        middleText: t('useRemote'),
        middleColor: 'warning',
        middleIcon: <DownloadRounded />,
        middleVariant: 'outlined',
        okText: t('useLocal'),
        okColor: 'warning',
        okIcon: <UploadRounded />,
        okVariant: 'outlined',
        onMiddleClick: async () => {
          try {
            await pull(projectId, { force: true });
            Toast.success(t('synced'));
          } catch (error) {
            Toast.error(getErrorMessage(error));
            throw error;
          }
        },
        onOk: async () => {
          try {
            await push(projectId, { force: true });
            Toast.success(t('synced'));
          } catch (error) {
            Toast.error(getErrorMessage(error));
            throw error;
          }
        },
        onClose: () => resolve(),
      });
    });
  }, [projectId, pull, push, showDialog, t]);

  return { dialog, showMergeConflictDialog };
}

interface RemoteRepoSettingForm {
  url: string;
  username: string;
  password: string;
}

function GitSettingContent() {
  const form = useFormContext<RemoteRepoSettingForm>();
  const [showPassword, setShowPassword] = useState(false);
  const { t } = useLocaleContext();

  return (
    <Stack gap={2}>
      <Alert severity="warning" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {t('remoteGitRepoUnauthorizedTip')}
      </Alert>

      <>
        <Box>
          <Typography variant="subtitle2" mb={0.5}>
            {`${t('url')}*`}
          </Typography>

          <TextField
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
            InputLabelProps={{ shrink: form.watch('url') ? true : undefined }}
            inputProps={{ readOnly: true }}
            error={Boolean(form.formState.errors.url)}
            helperText={form.formState.errors.url?.message}
          />
        </Box>

        <Box>
          <Typography variant="subtitle2" mb={0.5}>
            {t('username')}
          </Typography>

          <TextField
            fullWidth
            label={t('username')}
            {...form.register('username')}
            error={Boolean(form.formState.errors.username)}
            helperText={form.formState.errors.username?.message}
            InputLabelProps={{ shrink: form.watch('username') ? true : undefined }}
            inputProps={{ readOnly: true }}
          />
        </Box>

        <Box>
          <Typography variant="subtitle2" mb={0.5}>
            {t('accessToken')}
          </Typography>

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
        </Box>
      </>
    </Stack>
  );
}

export function useUnauthorizedDialog({ projectId }: { projectId: string }) {
  const { t } = useLocaleContext();
  const { dialog, showDialog, closeDialog } = useDialog();

  const { state, addRemote, push } = useProjectState(projectId, getDefaultBranch());

  const form = useForm<RemoteRepoSettingForm>({ defaultValues: { url: '', username: '', password: '' } });

  useEffect(() => {
    if (state.project?.gitUrl) {
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

      form.setValue('url', url);
      form.setValue('username', username);
    }
  }, [state.project?.gitUrl]);

  const saveSetting = useCallback(
    async (value: RemoteRepoSettingForm) => {
      try {
        await addRemote(projectId, value);
        await push(projectId, { force: true });
        Toast.success(t('synced'));
      } catch (error) {
        form.reset(value);

        if (isTheErrorUnauthorizedAccessToken(error)) {
          Toast.warning(t('remoteGitRepoUnauthorizedToast'));
          return;
        }

        Toast.error(getErrorMessage(error));
        throw error;
      } finally {
        closeDialog();
      }
    },
    [addRemote, form, projectId]
  );

  const showUnauthorizedDialog = useCallback(async () => {
    return new Promise<void>((resolve) => {
      showDialog({
        fullWidth: true,
        maxWidth: 'sm',
        title: (
          <Stack direction="row" alignItems="center" gap={1}>
            <WarningRounded color="warning" fontSize="large" /> {t('remoteGitRepoUnauthorized')}
          </Stack>
        ),
        content: (
          <FormProvider {...form}>
            <GitSettingContent />
          </FormProvider>
        ),
        cancelText: t('cancel'),
        okText: t('sync'),
        okColor: 'warning',
        okIcon: <SyncRounded />,
        okVariant: 'outlined',
        onOk: form.handleSubmit(saveSetting),
        onClose: () => resolve(),
      });
    });
  }, [projectId, push, showDialog, t]);

  return { dialog, showUnauthorizedDialog };
}
