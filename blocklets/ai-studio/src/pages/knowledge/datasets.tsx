import Button from '@arcblock/ux/lib/Button';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { SaveRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Popover,
  Stack,
  StackProps,
  TextField,
  styled,
} from '@mui/material';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

import PromiseLoadingButton from '../../components/promise-loading-button';
import { useDatasets } from '../../contexts/datasets/datasets';
import { getErrorMessage } from '../../libs/api';
import Add from '../project/icons/add';
import Database from '../project/icons/database';
import Delete from '../project/icons/delete';

type DatasetInput = { name: string; description?: string };

export default function KnowledgeDatasets() {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { projectId } = useParams();

  const dialogState = usePopupState({ variant: 'dialog' });
  const { datasets, refetch, createDataset, deleteDataset } = useDatasets();
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
                key={item.id}
                name={item.name}
                description={item.description}
                documents={item.documents}
                onClick={() => navigate(item.id)}
                onDelete={() => onDelete(item.id)}
                className="listItem"
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
        <DialogTitle>{t('knowledge.createTitle')}</DialogTitle>

        <DialogContent>
          <Stack gap={2}>
            <Controller
              control={form.control}
              name="name"
              rules={{
                required: t('validation.fieldRequired'),
              }}
              render={({ field, fieldState }) => {
                return (
                  <TextField
                    label={t('knowledge.name')}
                    sx={{ width: 1 }}
                    {...field}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                );
              }}
            />

            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => {
                return (
                  <TextField
                    label={t('knowledge.description')}
                    sx={{ width: 1 }}
                    {...field}
                    error={Boolean(fieldState.error)}
                    helperText={fieldState.error?.message}
                  />
                );
              }}
            />
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
        <Add sx={{ width: '2rem', height: '2rem' }} />

        <Box className="itemHeading">
          <Box className="headingContent">{name || ''}</Box>
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
  ...props
}: { name?: string; description?: string; documents?: number; onDelete: () => any } & StackProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);
  const { t } = useLocaleContext();

  return (
    <>
      <DatasetItemRoot {...props}>
        <Box className="itemTitle">
          <Database sx={{ width: '2rem', height: '2rem' }} />

          <Box className="itemHeading">
            <Box className="headingContent">{name || t('unnamed')}</Box>
          </Box>

          <Box className="deleteIcon">
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                setAnchorEl(e.currentTarget);
              }}>
              <Delete sx={{ fontSize: '16px' }} />
            </IconButton>
          </Box>
        </Box>

        <Box className="itemDescription">{description || ''}</Box>

        <Box className="itemFooter">
          <Box className="itemStats">{`${documents || 0} ${t('knowledge.document')}`}</Box>
        </Box>
      </DatasetItemRoot>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <DialogTitle>{t('knowledge.deleteTitle')}</DialogTitle>

        <DialogContent sx={{ fontSize: '14px', lineHeight: '22px' }}>{t('knowledge.deleteDescription')}</DialogContent>

        <DialogActions>
          <Button size="small" onClick={() => setAnchorEl(null)}>
            {t('cancel')}
          </Button>

          <PromiseLoadingButton
            size="small"
            variant="contained"
            color="error"
            onClick={() => {
              setAnchorEl(null);
              onDelete();
            }}>
            {t('delete')}
          </PromiseLoadingButton>
        </DialogActions>
      </Popover>
    </>
  );
}

const DatasetItemRoot = styled(Stack)`
  display: flex;
  min-height: 140px;
  cursor: pointer;
  flex-direction: column;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  background: rgb(255, 255, 255);
  box-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

  &.newItemCard {
    outline: 1px solid #e5e7eb;
    outline-offset: -1px;
    border-width: 0;

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
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
`;
