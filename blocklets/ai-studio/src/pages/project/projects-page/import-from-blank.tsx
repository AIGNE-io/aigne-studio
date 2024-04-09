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
  IconButton,
  Stack,
  TextField,
} from '@mui/material';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { cloneElement, useCallback, useId } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useProjectsState } from '../../../contexts/projects';
import { getErrorMessage } from '../../../libs/api';
import { ProjectWithUserInfo, createProject } from '../../../libs/project';
import Add from '../icons/add';
import Close from '../icons/close';

interface BlankForm {
  description: string;
  name: string;
}

export default function ImportFromBlank({ children, item }: { children: any; item?: ProjectWithUserInfo }) {
  const { t } = useLocaleContext();
  const id = useId();
  const navigate = useNavigate();
  const dialogState = usePopupState({ variant: 'dialog', popupId: id });
  const { importProject } = useProjectsState();

  const form = useForm<BlankForm>({
    defaultValues: { description: '', name: '' },
  });

  const save = useCallback(
    async (value: BlankForm) => {
      try {
        if (!item) {
          throw new Error('item is not found');
        }

        const project = await createProject({ templateId: item._id, ...value });
        currentGitStore.setState({ currentProjectId: project._id });
        navigate(joinURL('/projects', project._id));
      } catch (error) {
        form.reset(value);
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [dialogState, form, importProject, navigate]
  );

  return (
    <>
      {cloneElement(children, { onClick: () => dialogState.open() })}

      <Dialog
        {...bindDialog(dialogState)}
        disableEnforceFocus
        maxWidth="sm"
        fullWidth
        component="form"
        onSubmit={form.handleSubmit(save)}>
        <DialogTitle className="between">
          <Box>{t('newObject', { object: t('form.project') })}</Box>

          <IconButton size="small" onClick={() => dialogState.close()}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack overflow="auto" gap={1.5}>
            <Box>
              <Box fontWeight={500} fontSize={14} lineHeight="24px">
                {t('projectSetting.name')}
              </Box>
              <TextField
                autoFocus
                label={t('projectSetting.name')}
                sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
                {...form.register('name')}
              />
            </Box>

            <Box>
              <Box fontWeight={500} fontSize={14} lineHeight="24px">
                {t('projectSetting.description')}
              </Box>
              <TextField
                label={t('projectSetting.description')}
                multiline
                rows={4}
                sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
                {...form.register('description')}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={dialogState.close} className="cancel">
            {t('cancel')}
          </Button>

          <LoadingButton
            className="save"
            variant="contained"
            type="submit"
            loading={form.formState.isSubmitting}
            loadingPosition="start"
            startIcon={<Add />}>
            {t('create')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
