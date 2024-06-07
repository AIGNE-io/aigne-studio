import currentGitStore from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import PlusIcon from '@iconify-icons/tabler/plus';
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
  Typography,
} from '@mui/material';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useProjectsState } from '../../../contexts/projects';
import { getErrorMessage } from '../../../libs/api';
import { ProjectWithUserInfo, createProject } from '../../../libs/project';
import Close from '../icons/close';

interface BlankForm {
  description: string;
  name: string;
}

export default function ImportFromBlank({ onClose, item }: { onClose: () => void; item?: ProjectWithUserInfo }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { createLimitDialog, limitDialog } = useProjectsState();

  const form = useForm<BlankForm>({
    defaultValues: { description: '', name: '' },
  });

  const save = useCallback(
    async (value: BlankForm) => {
      try {
        if (!item) {
          throw new Error('item is not found');
        }

        const project = await createProject({ templateId: item.id, ...value });
        currentGitStore.setState({ currentProjectId: project.id });
        navigate(joinURL('/projects', project.id));
      } catch (error) {
        form.reset(value);
        const message = getErrorMessage(error);
        if (String(message || '').includes('Project limit exceeded')) {
          createLimitDialog();
        } else {
          Toast.error(message);
        }

        throw error;
      }
    },
    [form, navigate]
  );

  return (
    <>
      <Dialog
        open
        disableEnforceFocus
        maxWidth="sm"
        fullWidth
        component="form"
        onSubmit={form.handleSubmit(save)}
        onClose={onClose}>
        <DialogTitle className="between">
          <Box>{t('newObject', { object: t('project') })}</Box>

          <IconButton size="small" onClick={() => onClose()}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack overflow="auto" gap={1.5}>
            <Box>
              <Typography variant="subtitle2">{t('name')}</Typography>
              <TextField
                placeholder={t('newProjectNamePlaceholder')}
                hiddenLabel
                autoFocus
                sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
                {...form.register('name')}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2">{t('description')}</Typography>
              <TextField
                placeholder={t('newProjectDescriptionPlaceholder')}
                hiddenLabel
                multiline
                minRows={2}
                maxRows={3}
                sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
                {...form.register('description')}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} className="cancel" variant="outlined">
            {t('cancel')}
          </Button>

          <LoadingButton
            className="save"
            variant="contained"
            type="submit"
            loading={form.formState.isSubmitting}
            loadingPosition="start"
            startIcon={<Box component={Icon} icon={PlusIcon} />}>
            {t('create')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
      {limitDialog}
    </>
  );
}
