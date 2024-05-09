import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import BookIcon from '@iconify-icons/tabler/book-2';
import FloppyIcon from '@iconify-icons/tabler/device-floppy';
import DotsVerticalIcon from '@iconify-icons/tabler/dots-vertical';
import PencilIcon from '@iconify-icons/tabler/pencil';
import PlusIcon from '@iconify-icons/tabler/plus';
import TrashIcon from '@iconify-icons/tabler/trash';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Button,
  ClickAwayListener,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  MenuItem,
  Paper,
  Stack,
  StackProps,
  TextField,
  Theme,
  Tooltip,
  Typography,
  styled,
  tooltipClasses,
  useMediaQuery,
} from '@mui/material';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

import { useDatasets } from '../../contexts/datasets/datasets';
import { getErrorMessage } from '../../libs/api';
import useDialog from '../../utils/use-dialog';
import Add from '../project/icons/add';
import Close from '../project/icons/close';

type DatasetInput = { name: string; description?: string };

export default function KnowledgeDatasets() {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { projectId } = useParams();

  const dialogState = usePopupState({ variant: 'dialog' });
  const { datasets, refetch, createDataset, updateDataset, deleteDataset } = useDatasets();
  const form = useForm<DatasetInput>({ defaultValues: { description: '', name: '' } });

  useEffect(() => {
    if (projectId) refetch(projectId);
  }, [projectId]);

  const onSave = useCallback(
    async (input: DatasetInput) => {
      try {
        const dataset = await createDataset(projectId, { ...input, appId: projectId });
        dialogState.close();
        navigate(`./${dataset.id}`);
      } catch (error) {
        Toast.error(getErrorMessage(error));
      }
    },
    [t, projectId, form]
  );

  const onDelete = useCallback(
    async (datasetId: string) => {
      try {
        await deleteDataset(projectId, datasetId);
        dialogState.close();
      } catch (error) {
        Toast.error(getErrorMessage(error));
      }
    },
    [t, projectId]
  );

  const onUpdate = useCallback(
    async (
      datasetId: string,
      data: {
        name: string;
        description: string;
      }
    ) => {
      try {
        await updateDataset(projectId || '', datasetId, data);
      } catch (error) {
        Toast.error(getErrorMessage(error));
      }
    },
    [t, projectId]
  );

  return (
    <>
      <Stack m={2.5} overflow="auto">
        <ListContainer gap={2.5}>
          <DatasetItemAdd
            name={t('knowledge.createTitle')}
            description={t('knowledge.createDescription')}
            onClick={dialogState.open}
            className="listItem newItemCard"
          />

          {datasets.map((item) => {
            return (
              <DatasetItem
                p={2}
                key={item.id}
                name={item.name}
                description={item.description}
                documents={item.documents}
                onClick={() => navigate(item.id)}
                onDelete={() => onDelete(item.id)}
                className="listItem"
                onUpdate={(data) => onUpdate(item.id, data)}
              />
            );
          })}
        </ListContainer>
      </Stack>

      <Dialog
        {...bindDialog(dialogState)}
        fullWidth
        maxWidth="sm"
        component="form"
        onSubmit={form.handleSubmit(onSave)}>
        <DialogTitle className="between" sx={{ border: 0 }}>
          <Box>{t('newObject', { object: t('knowledge.knowledge') })}</Box>

          <IconButton size="small" onClick={() => dialogState.close()}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack gap={2}>
            <Controller
              control={form.control}
              name="name"
              rules={{ required: t('validation.fieldRequired') }}
              render={({ field, fieldState }) => {
                return (
                  <Box>
                    <Typography variant="subtitle2">{t('name')}</Typography>
                    <TextField
                      fullWidth
                      hiddenLabel
                      placeholder={t('knowledge.namePlaceholder')}
                      {...field}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  </Box>
                );
              }}
            />

            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => {
                return (
                  <Box>
                    <Typography variant="subtitle2">{t('description')}</Typography>
                    <TextField
                      fullWidth
                      hiddenLabel
                      multiline
                      minRows={2}
                      {...field}
                      error={Boolean(fieldState.error)}
                      helperText={fieldState.error?.message}
                    />
                  </Box>
                );
              }}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={dialogState.close} variant="outlined">
            {t('cancel')}
          </Button>

          <LoadingButton
            type="submit"
            variant="contained"
            startIcon={<Icon icon={PlusIcon} />}
            loadingPosition="start"
            loading={form.formState.isSubmitting}>
            {t('create')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}

function DatasetItemAdd({
  name,
  description,
  ...props
}: {
  name?: string;
  description?: string;
} & StackProps) {
  return (
    <DatasetItemRoot {...props} className="center">
      <Stack className="center">
        <Add sx={{ width: '2rem', height: '2rem', color: '#9CA3AF' }} />

        <Box className="itemHeading">
          <Typography variant="subtitle4" color="#9CA3AF" className="headingContent">
            {name || ''}
          </Typography>
        </Box>
      </Stack>
    </DatasetItemRoot>
  );
}

function DatasetItem({
  name,
  description,
  documents,
  onDelete,
  onUpdate,
  ...props
}: {
  name?: string;
  description?: string;
  documents?: number;
  onDelete: () => void;
  onUpdate: (data: { name: string; description: string }) => void;
} & StackProps) {
  const { t } = useLocaleContext();
  const [open, setOpen] = useState(false);
  const { dialog, showDialog } = useDialog();
  const isMobile = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));

  return (
    <>
      <DatasetItemRoot
        {...props}
        justifyContent="space-between"
        sx={{
          ':hover': {
            '.hover-visible': { maxWidth: '100%' },
          },
        }}>
        <Stack flexDirection="row" gap={1.5}>
          <Box width={72} height={72} className="center" bgcolor="#E5E7EB" borderRadius={1}>
            <Box component={Icon} icon={BookIcon} fontSize={30} />
          </Box>

          <Box width={0} flex={1}>
            <Box className="between">
              <Typography variant="subtitle1">{name || t('unnamed')}</Typography>

              <Box display="flex" alignItems="center">
                <Stack
                  component="span"
                  className="hover-visible"
                  justifyContent="center"
                  alignItems="flex-end"
                  overflow="hidden"
                  sx={{ maxWidth: open ? '100%' : isMobile ? '100%' : 0 }}>
                  <Tooltip
                    open={open}
                    placement="right-start"
                    onClose={() => setOpen(false)}
                    disableFocusListener
                    disableHoverListener
                    disableTouchListener
                    componentsProps={{
                      popper: {
                        sx: {
                          [`&.${tooltipClasses.popper}[data-popper-placement*="left"] .${tooltipClasses.tooltip}`]: {
                            mr: 1,
                          },
                          [`&.${tooltipClasses.popper}[data-popper-placement*="right"] .${tooltipClasses.tooltip}`]: {
                            ml: 1,
                          },
                        },
                      },
                      tooltip: { sx: { bgcolor: 'background.paper', boxShadow: 1, m: 0, p: 0.5 } },
                    }}
                    title={
                      <ClickAwayListener onClickAway={() => setOpen(false)}>
                        <Paper elevation={0}>
                          <List onClick={() => setOpen(false)}>
                            <MenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpen(false);

                                let newName = '';
                                let newDescription = '';

                                showDialog({
                                  maxWidth: 'sm',
                                  fullWidth: true,
                                  title: (
                                    <Box sx={{ wordWrap: 'break-word' }}>
                                      {t('editObject', { object: t('knowledge.knowledge') })}
                                    </Box>
                                  ),
                                  content: (
                                    <Stack gap={2}>
                                      <Box>
                                        <Typography variant="subtitle2">{t('name')}</Typography>
                                        <TextField
                                          hiddenLabel
                                          fullWidth
                                          placeholder={t('knowledge.namePlaceholder')}
                                          defaultValue={name}
                                          onChange={(e) => (newName = e.target.value)}
                                        />
                                      </Box>

                                      <Box>
                                        <Typography variant="subtitle2">{t('description')}</Typography>
                                        <TextField
                                          hiddenLabel
                                          fullWidth
                                          multiline
                                          minRows={2}
                                          defaultValue={description}
                                          onChange={(e) => (newDescription = e.target.value)}
                                        />
                                      </Box>
                                    </Stack>
                                  ),
                                  okIcon: <Icon icon={FloppyIcon} />,
                                  okText: t('save'),
                                  cancelText: t('cancel'),
                                  onOk: () => onUpdate({ name: newName, description: newDescription }),
                                });
                              }}>
                              <Box component={Icon} icon={PencilIcon} mr={1} width={15} />
                              {t('edit')}
                            </MenuItem>

                            <MenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpen(false);

                                showDialog({
                                  formSx: {
                                    '.MuiDialogTitle-root': {
                                      border: 0,
                                    },
                                    '.MuiDialogActions-root': {
                                      border: 0,
                                    },
                                    '.save': {
                                      background: '#d32f2f',
                                    },
                                  },
                                  maxWidth: 'sm',
                                  fullWidth: true,
                                  title: <Box sx={{ wordWrap: 'break-word' }}>{t('knowledge.deleteTitle')}</Box>,
                                  content: (
                                    <Box>
                                      <Typography fontWeight={500} fontSize={16} lineHeight="28px" color="#4B5563">
                                        {t('knowledge.deleteDescription')}
                                      </Typography>
                                    </Box>
                                  ),
                                  okText: t('alert.delete'),
                                  okColor: 'error',
                                  cancelText: t('cancel'),
                                  onOk: onDelete,
                                });
                              }}
                              sx={{ color: '#E11D48' }}>
                              <Box component={Icon} icon={TrashIcon} mr={1} width={15} color="#E11D48" />
                              {t('delete')}
                            </MenuItem>
                          </List>
                        </Paper>
                      </ClickAwayListener>
                    }>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(true);
                      }}
                      sx={{ padding: 0.5, minWidth: 0, bgcolor: open ? 'action.hover' : undefined }}>
                      <Box component={Icon} icon={DotsVerticalIcon} fontSize={16} />
                    </Button>
                  </Tooltip>
                </Stack>
              </Box>
            </Box>
            <Typography variant="subtitle3">{description || ''}</Typography>
          </Box>
        </Stack>

        <Typography variant="subtitle5">{`${documents || 0} ${(documents || 0) > 0 ? t('knowledge.documents.documents') : t('knowledge.documents.document')}`}</Typography>
      </DatasetItemRoot>

      {dialog}
    </>
  );
}

const DatasetItemRoot = styled(Stack)`
  display: flex;
  min-height: 140px;
  cursor: pointer;
  flex-direction: column;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  background: rgb(255, 255, 255);
  box-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &.newItemCard {
    outline: 1px solid #e5e7eb;
    outline-offset: -1px;

    &:hover {
      background: rgb(255, 255, 255);
      box-shadow:
        0px 1px 2px rgba(16, 24, 40, 0.06),
        0px 1px 3px rgba(16, 24, 40, 0.1);
    }
  }

  &.listItem {
    border-color: rgba(0, 0, 0, 0.12);

    &:hover {
      box-shadow:
        0px 4px 6px -2px rgba(16, 24, 40, 0.03),
        0px 12px 16px -4px rgba(16, 24, 40, 0.08);

      .deleteIcon {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }

  .itemTitle {
    display: flex;
    height: 66px;
    align-items: center;
    gap: 0.75rem;
    padding: 14px 14px 0.75rem;

    .itemHeading {
      position: relative;
      height: 2rem;
      flex-grow: 1;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 2rem;

      .headingContent {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .deleteIcon {
      display: none;
      border-radius: 4px;
      background-position: 50%;
      background-repeat: no-repeat;
      transition:
        color 0.2s,
        background-color 0.2s,
        border-color 0.2s,
        text-decoration-color 0.2s,
        fill 0.2s,
        stroke 0.2s;
    }
  }

  .itemDescription {
    margin-bottom: 0.75rem;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    height: 2.25rem;
    padding: 14px;
    font-size: 0.75rem;
    line-height: 1.5;
    color: rgb(107, 114, 128);
  }

  .itemFooter {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.75rem;
    line-height: 1rem;
    color: rgb(107, 114, 128);
    min-height: 42px;
    flex-wrap: wrap;
    padding: 0.5rem 14px 10px;

    .itemStats {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
  }
`;

const ListContainer = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
`;
