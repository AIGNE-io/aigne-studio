import { checkErrorType } from '@app/libs/util';
import currentGitStore from '@app/store/current-git-store';
import DidAvatar from '@arcblock/ux/lib/Avatar';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { RuntimeErrorType } from '@blocklet/ai-runtime/types/runtime/error';
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
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useProjectsState } from '../../../contexts/projects';
import { getErrorMessage } from '../../../libs/api';
import { createProject, getTemplatesProjects } from '../../../libs/project';
import Close from '../icons/close';
import NameField from './components/name-field';

interface BlankForm {
  description: string;
  name: string;
  templateIds: string;
}

export default function ImportFromBlank({ onClose }: { onClose: () => void }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { createLimitDialog } = useProjectsState();

  const { data, loading, error } = useRequest(() => getTemplatesProjects());
  const templates = error ? [] : data?.templates || [];

  const form = useForm<BlankForm>({
    defaultValues: { description: '', name: '', templateIds: '' },
  });
  const templateIds = form.watch('templateIds');

  const save = useCallback(
    async (value: BlankForm) => {
      try {
        const { name, description, templateIds } = value;

        const project = await createProject({
          templateId: '',
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
        if (checkErrorType(error, RuntimeErrorType.ProjectLimitExceededError)) {
          createLimitDialog();
        } else {
          Toast.error(message);
        }

        throw error;
      }
    },
    [form, navigate]
  );

  const template = templates.find((x) => `${x.blockletDid}-${x.id}` === templateIds);

  return (
    <Dialog
      data-testid="newProjectDialog"
      open
      disableEnforceFocus
      maxWidth="md"
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
        <Stack
          sx={{
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 2.5, md: 4 },
          }}>
          <Stack
            sx={{
              flex: 1,
              gap: 2.5,
            }}>
            <Box>
              <Typography variant="subtitle2">{t('choose')}</Typography>

              <Controller
                name="templateIds"
                control={form.control}
                render={({ field }) => (
                  <TextField
                    {...field}
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
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            {loading && <CircularProgress size={12} sx={{ mr: 2 }} />}
                          </InputAdornment>
                        ),
                      },

                      select: {
                        displayEmpty: true,
                        renderValue: (selected) => {
                          const selectedItem = templates.find((item) => `${item.blockletDid}-${item.id}` === selected);
                          if (!selectedItem) {
                            return (
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{
                                  alignItems: 'center',
                                }}>
                                <DidAvatar did={window.blocklet.appId} size={20} src="" />
                                <Typography variant="subtitle2" noWrap>
                                  {t('blankTemplate')}
                                </Typography>
                              </Stack>
                            );
                          }

                          return (
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{
                                alignItems: 'center',
                              }}>
                              <DidAvatar did={selectedItem.blockletDid} size={20} src="" />
                              <Typography variant="body2" noWrap>
                                {selectedItem?.name || t('unnamed')}
                              </Typography>
                            </Stack>
                          );
                        },
                      },
                    }}>
                    <MenuItem value="">
                      <Stack
                        direction="row"
                        sx={{
                          alignItems: 'stretch',
                          gap: 1,
                        }}>
                        <DidAvatar did={window.blocklet.appId} size={40} src="" />
                        <Stack
                          sx={{
                            flex: 1,
                            width: 1,
                          }}>
                          <Typography variant="subtitle2" noWrap>
                            {t('blankTemplate')}
                          </Typography>
                        </Stack>
                      </Stack>
                    </MenuItem>

                    {templates.map((item) => (
                      <MenuItem key={item.id} value={`${item.blockletDid}-${item.id}`}>
                        <Stack
                          direction="row"
                          sx={{
                            alignItems: 'stretch',
                            gap: 1,
                          }}>
                          <DidAvatar did={item.blockletDid} size={40} src="" />
                          <Stack
                            sx={{
                              flex: 1,
                              width: 1,
                            }}>
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
                    ))}
                  </TextField>
                )}
              />

              <Typography
                variant="caption"
                sx={{
                  color: 'text.disabled',
                }}>
                {t('selectTemplate')}
              </Typography>
            </Box>

            {template?.description && (
              <Box>
                <Typography variant="subtitle2">{template?.description}</Typography>
              </Box>
            )}
          </Stack>

          <Stack
            sx={{
              flex: 1,
              gap: 2.5,
            }}>
            <Box>
              <Typography variant="subtitle2">{t('name')}</Typography>
              <NameField form={form} beforeDuplicateProjectNavigate={onClose} />
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
