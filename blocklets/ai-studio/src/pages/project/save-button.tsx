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
} from '@mui/material';
import { bindDialog, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import joinUrl from 'url-join';

import { useIsAdmin } from '../../contexts/session';
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
    state: { branches },
    refetch,
  } = useProjectState(projectId, gitRef);

  const form = useForm<CommitForm>({});

  useEffect(() => {
    if (dialogState.isOpen) form.reset();
    if (branches.includes(gitRef)) {
      form.setValue('branch', gitRef);
    }
  }, [dialogState.isOpen]);

  const isAdmin = useIsAdmin();
  const disableMutation = gitRef === defaultBranch && !isAdmin;

  const onSave = useCallback(
    async (form: CommitForm) => {
      try {
        await commitFromWorking({
          projectId,
          ref: gitRef,
          input: {
            branch: form.branch,
            message: form.message || new Date().toLocaleString(),
          },
        });

        dialogState.close();
        refetch();
        Toast.success(t('alert.saved'));
        if (form.branch !== gitRef) navigate(joinUrl('..', form.branch), { replace: true });
      } catch (error) {
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [gitRef, navigate, projectId, refetch, t]
  );

  const submitting = form.formState.isSubmitting;

  return (
    <>
      <Button
        {...bindTrigger(dialogState)}
        disabled={disableMutation || submitting}
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
                    onChange={(_, branch) => form.setValue('branch', branch)}
                  />
                )}
              />
            </Box>

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
          <LoadingButton
            type="submit"
            variant="contained"
            startIcon={<SaveRounded />}
            loadingPosition="start"
            loading={form.formState.isSubmitting}>
            {t('save')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
