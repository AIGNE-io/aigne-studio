import currentGitStore from '@app/store/current-git-store';
import DidAvatar from '@arcblock/ux/lib/Avatar';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import PlusIcon from '@iconify-icons/tabler/plus';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useProjectsState } from '../../../contexts/projects';
import { getErrorMessage } from '../../../libs/api';
import { createProject, getTemplatesProjects } from '../../../libs/project';
import Close from '../icons/close';

interface BlankForm {
  description: string;
  name: string;
  templateIds: string;
}

export default function ImportFromBlank({ onClose }: { onClose: () => void }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { createLimitDialog, limitDialog } = useProjectsState();

  const { data, loading, error } = useRequest(() => getTemplatesProjects());
  const list = error ? [] : data?.templates || [];
  const blank = (list || []).find((x) => !x.blockletDid);
  const templates = (list || []).filter((x) => x.blockletDid);

  const form = useForm<BlankForm>({ defaultValues: { description: '', name: '', templateIds: '' } });
  const templateIds = form.watch('templateIds');

  const save = useCallback(
    async (value: BlankForm) => {
      try {
        const { name, description, templateIds } = value;

        const project = await createProject({
          templateId: blank?.id,
          name,
          description,
          ...(templateIds
            ? {
                blockletDid: templateIds.split('-')[0],
                templateId: templateIds.split('-')[1],
              }
            : {}),
        });

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
    [blank, form, navigate]
  );

  const template = templates.find((x) => `${x.blockletDid}-${x.id}` === templateIds);

  return (
    <>
      <Dialog
        data-testid="newProjectDialog"
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
          <Stack flexDirection="row" gap={4}>
            <Stack flex={1} gap={1.5}>
              <Box>
                <Typography variant="subtitle2">{t('choose')}</Typography>
                <TextField
                  select
                  disabled={loading}
                  hiddenLabel
                  placeholder={t('choose')}
                  autoFocus
                  sx={{
                    width: 1,
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    '.MuiSelect-select:focus': {
                      background: 'transparent',
                    },
                  }}
                  SelectProps={{
                    displayEmpty: true,
                    renderValue: (selected) => {
                      if (!selected) {
                        return (
                          <Typography variant="body2" color="text.disabled">
                            {t('choose')}
                          </Typography>
                        );
                      }

                      const selectedItem = templates.find((item) => `${item.blockletDid}-${item.id}` === selected);
                      if (!selectedItem) return null;
                      return (
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <DidAvatar did={selectedItem.blockletDid} size={20} />
                          <Typography variant="body2" noWrap>
                            {selectedItem?.name || t('unnamed')}
                          </Typography>
                        </Stack>
                      );
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        {loading && <CircularProgress size={12} sx={{ mr: 2 }} />}
                      </InputAdornment>
                    ),
                  }}
                  {...form.register('templateIds')}>
                  {templates.map((item) => {
                    return (
                      <MenuItem key={item.id} value={`${item.blockletDid}-${item.id}`}>
                        <Stack direction="row" alignItems="stretch" gap={2}>
                          <DidAvatar did={item.blockletDid} size={40} />

                          <Stack flex={1} width={1}>
                            <Typography variant="subtitle2" noWrap>
                              {item?.name || t('unnamed')}
                            </Typography>

                            <Typography
                              variant="caption"
                              sx={{
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 2,
                                overflow: 'hidden',
                              }}>
                              {item?.description}
                            </Typography>
                          </Stack>
                        </Stack>
                      </MenuItem>
                    );
                  })}
                </TextField>
              </Box>

              <Box>
                <Typography variant="subtitle2">{template?.description}</Typography>
              </Box>
            </Stack>
            <Stack flex={1} gap={1.5}>
              <Box>
                <Typography variant="subtitle2">{t('name')}</Typography>
                <TextField
                  data-testid="projectNameField"
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
