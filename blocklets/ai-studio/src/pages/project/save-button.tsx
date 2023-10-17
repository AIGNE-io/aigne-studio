import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { SaveRounded } from '@mui/icons-material';
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
} from '@mui/material';
import { bindDialog, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import joinUrl from 'url-join';

import { useReadOnly } from '../../contexts/session';
import { getErrorMessage } from '../../libs/api';
import { commitFromWorking } from '../../libs/working';
import { defaultBranch, useProjectState } from './state';

interface CommitForm {
  branch: string;
  message: string;
}

export default function SaveButton({ projectId, gitRef }: { projectId: string; gitRef: string }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();

  const dialogState = usePopupState({ variant: 'dialog' });

  const {
    state: { branches, project },
    refetch,
  } = useProjectState(projectId, gitRef);

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
        await commitFromWorking({
          projectId,
          ref: gitRef,
          input: {
            branch: simpleMode ? defaultBranch : input.branch,
            message: input.message || new Date().toLocaleString(),
          },
        });

        dialogState.close();
        refetch();
        Toast.success(t('alert.saved'));
        if (input.branch !== gitRef) navigate(joinUrl('..', input.branch), { replace: true });
      } catch (error) {
        form.reset(input);
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [gitRef, navigate, projectId, refetch, t, simpleMode]
  );

  const submitting = form.formState.isSubmitting;

  return (
    <>
      <Button
        {...bindTrigger(dialogState)}
        disabled={submitting}
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
            <CircularProgress size={24} />
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
