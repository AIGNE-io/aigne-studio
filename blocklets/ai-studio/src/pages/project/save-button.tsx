import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { DownloadRounded, SaveRounded, UploadRounded, WarningRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useKeyPress } from 'ahooks';
import { bindDialog, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { joinURL as joinUrl } from 'ufo';

import { useReadOnly } from '../../contexts/session';
import { getErrorMessage } from '../../libs/api';
import { commitFromWorking } from '../../libs/working';
import useDialog from '../../utils/use-dialog';
import { defaultBranch, useProjectState, useTemplatesChangesState } from './state';

interface CommitForm {
  branch: string;
  message: string;
}

export default function SaveButton({ projectId, gitRef }: { projectId: string; gitRef: string }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();

  const { dialog, showMergeConflictDialog } = useMergeConflictDialog({ projectId });

  const dialogState = usePopupState({ variant: 'dialog' });

  const {
    state: { branches, project },
    refetch,
  } = useProjectState(projectId, gitRef);

  const { disabled, run } = useTemplatesChangesState(projectId, gitRef);

  const simpleMode = !project || project?.gitType === 'simple';

  const form = useForm<CommitForm>({});

  useEffect(() => {
    if (dialogState.isOpen) form.reset();
    if (branches.includes(gitRef)) {
      form.setValue('branch', gitRef);
    }
  }, [dialogState.isOpen]);

  const branch = form.getValues('branch');
  const readOnly = useReadOnly({ ref: branch });

  const onSave = useCallback(
    async (input: CommitForm) => {
      try {
        let needMergeConflict = false;

        const branch = simpleMode ? defaultBranch : input.branch;
        try {
          await commitFromWorking({
            projectId,
            ref: gitRef,
            input: {
              branch,
              message: input.message || new Date().toLocaleString(),
            },
          });
        } catch (error) {
          needMergeConflict = isTheErrorShouldShowMergeConflict(error);
          if (!needMergeConflict) throw error;
        }

        dialogState.close();

        if (needMergeConflict) {
          Toast.warning(t('alert.savedButSyncConflicted'));
          await showMergeConflictDialog();
        } else {
          Toast.success(t('alert.saved'));
        }

        refetch();
        run();
        if (branch !== gitRef) navigate(joinUrl('..', branch), { replace: true });
      } catch (error) {
        form.reset(input);
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [simpleMode, dialogState, refetch, run, gitRef, navigate, projectId, t, showMergeConflictDialog, form]
  );

  const submitting = form.formState.isSubmitting;

  useKeyPress(
    (e) => (e.ctrlKey || e.metaKey) && e.key === 's',
    (e) => {
      e.preventDefault();
      dialogState.open();
    }
  );

  return (
    <>
      {dialog}

      <Button
        {...bindTrigger(dialogState)}
        disabled={submitting || disabled}
        sx={{ position: 'relative', minWidth: 32, minHeight: 32 }}>
        <SaveRounded sx={{ opacity: submitting ? 0 : 1 }} />
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

      <Dialog
        {...bindDialog(dialogState)}
        keepMounted={false}
        component="form"
        onSubmit={form.handleSubmit(onSave)}
        maxWidth="sm"
        fullWidth>
        <DialogTitle>{t('save')}</DialogTitle>
        <DialogContent>
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
          <Button onClick={dialogState.close}>{t('cancel')}</Button>
          <Tooltip title={readOnly ? t('noPermissionSaveToBranch', { branch }) : ''} placement="top">
            <span>
              <LoadingButton
                disabled={readOnly}
                type="submit"
                variant="contained"
                startIcon={<SaveRounded />}
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

export function useMergeConflictDialog({ projectId }: { projectId: string }) {
  const { t } = useLocaleContext();
  const { dialog, showDialog } = useDialog();

  const { push, pull } = useProjectState(projectId, defaultBranch);

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
            <Typography variant="subtitle1">{t('mergeConflictTip')}</Typography>
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
