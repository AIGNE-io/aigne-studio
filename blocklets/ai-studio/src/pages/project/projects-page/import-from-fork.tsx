import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ProjectSettings } from '@blocklet/ai-runtime/types/resource/project';
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
import { useForm } from 'react-hook-form';

import Close from '../icons/close';
import NameField from './components/name-field';

interface BlankForm {
  name: string;
  description: string;
}

export default function ImportFromFork({
  project,
  onCreate,
  onClose,
}: {
  project: ProjectSettings;
  onCreate: ({ name, description }: BlankForm) => void;
  onClose: () => void;
}) {
  const { t } = useLocaleContext();

  const form = useForm<BlankForm>({
    defaultValues: { name: project.name, description: project.description },
  });

  return (
    <Dialog
      data-testid="forkProjectDialog"
      open
      disableEnforceFocus
      maxWidth="sm"
      fullWidth
      component="form"
      onSubmit={form.handleSubmit(onCreate)}
      onClose={onClose}>
      <DialogTitle className="between">
        <Box>{t('makeYours')}</Box>

        <IconButton size="small" onClick={() => onClose()}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack
          sx={{
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 2.5, md: 4 }
          }}>
          <Stack
            sx={{
              flex: 1,
              gap: 2.5
            }}>
            <Box>
              <Typography variant="subtitle2">{t('name')}</Typography>
              <NameField form={form} triggerOnMount beforeDuplicateProjectNavigate={() => onClose()} />
            </Box>

            <Box>
              <Typography variant="subtitle2">{t('description')}</Typography>
              <TextField
                data-testid="projectDescriptionField"
                placeholder={t('newProjectDescriptionPlaceholder')}
                hiddenLabel
                multiline
                minRows={3}
                maxRows={5}
                sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
                {...form.register('description')}
              />
            </Box>
          </Stack>
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
  );
}
