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
  Stack,
  StackProps,
  TextField,
  styled,
} from '@mui/material';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';

import { useDatasets } from '../../../contexts/datasets';
import { getErrorMessage } from '../../../libs/api';
import Add from '../icons/add';
import Database from '../icons/database';
import Delete from '../icons/delete';

export default function Knowledge() {
  const { t } = useLocaleContext();
  const dialogState = usePopupState({ variant: 'dialog' });
  const form = useForm<{ name: string; description?: string }>({ defaultValues: { description: '', name: '' } });
  const navigate = useNavigate();

  const { datasets, refetch, createDataset, deleteDataset } = useDatasets();

  useEffect(() => {
    refetch();
  }, []);

  const onSave = useCallback(
    async (input: any) => {
      try {
        await createDataset(input);
        dialogState.close();
      } catch (error) {
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [t, form]
  );

  const onDelete = useCallback(
    async (datasetId: string) => {
      try {
        await deleteDataset(datasetId);
        dialogState.close();
      } catch (error) {
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [t]
  );

  return (
    <>
      <Stack m={{ xs: 2, sm: 3 }}>
        <ListContainer gap={{ xs: 2, sm: 3 }}>
          <DatasetItemAdd
            name="创建知识库"
            description="导入您自己的文本数据以增强 LLM 的上下文。"
            onClick={() => dialogState.open()}
            className="list_listItem list_newItemCard"
          />

          {datasets.map((item) => {
            return (
              <DatasetItem
                key={item.id}
                name={item.name}
                description={item.description}
                units={item.units}
                onClick={() => navigate(item.id)}
                onDelete={() => onDelete(item.id)}
                className="list_listItem"
                sx={{ '&:focus-visible': { outline: 0 } }}
              />
            );
          })}
        </ListContainer>
      </Stack>

      <Dialog
        {...bindDialog(dialogState)}
        maxWidth="sm"
        fullWidth
        component="form"
        onSubmit={form.handleSubmit(onSave)}>
        <DialogTitle>{t('Create Knowledge')}</DialogTitle>

        <DialogContent>
          <Stack gap={2}>
            <TextField label={t('projectSetting.name')} sx={{ width: 1 }} {...form.register('name')} />
            <TextField label={t('projectSetting.description')} sx={{ width: 1 }} {...form.register('description')} />
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
    <DatasetItemRoot {...props}>
      <Box className="list_listItemTitle">
        <Add sx={{ width: '2rem', height: '2rem' }} />

        <Box className="list_listItemHeading">
          <Box className="list_listItemHeadingContent">{name || ''}</Box>
        </Box>
      </Box>

      <Box className="list_listItemDescription">{description || ''}</Box>
    </DatasetItemRoot>
  );
}

function DatasetItem({
  name,
  description,
  units,
  onDelete,
  ...props
}: { name?: string; description?: string; units?: number; onDelete: () => any } & StackProps) {
  return (
    <DatasetItemRoot {...props}>
      <Box className="list_listItemTitle">
        <Database sx={{ width: '2rem', height: '2rem' }} />

        <Box className="list_listItemHeading">
          <Box className="list_listItemHeadingContent">{name || ''}</Box>
        </Box>

        <Box className="list_deleteDatasetIcon">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}>
            <Delete sx={{ fontSize: '16px' }} />
          </IconButton>
        </Box>
      </Box>

      <Box className="list_listItemDescription">{description || ''}</Box>

      <Box className="list_listItemFooter">
        <Box className="list_listItemStats">{`${units || 0} 文档`}</Box>
      </Box>
    </DatasetItemRoot>
  );
}

const DatasetItemRoot = styled(Stack)`
  display: flex;
  min-height: 160px;
  cursor: pointer;
  flex-direction: column;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  --tw-bg-opacity: 1;
  background-color: rgb(255 255 255 / var(--tw-bg-opacity));
  --tw-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.05);
  --tw-shadow-colored: 0px 1px 2px 0px var(--tw-shadow-color);
  transition-property: all;
  transition-duration: 0.2s;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);

  &.list_newItemCard {
    outline-style: solid;
    outline-width: 1px;
    outline-offset: -1px;
    outline-color: #e5e7eb;
    background-color: rgba(229, 231, 235, 0.5);
    border-width: 0;

    &:hover {
      background-color: rgb(255 255 255 / var(--tw-bg-opacity));
      --tw-shadow: 0px 1px 2px 0px rgba(16, 24, 40, 0.06), 0px 1px 3px 0px rgba(16, 24, 40, 0.1);
      --tw-shadow-colored: 0px 1px 2px 0px var(--tw-shadow-color), 0px 1px 3px 0px var(--tw-shadow-color);
      box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);
    }
  }

  &.list_listItem {
    border-color: rgba(0, 0, 0, 0.12);

    &:hover {
      --tw-shadow: 0px 4px 6px -2px rgba(16, 24, 40, 0.03), 0px 12px 16px -4px rgba(16, 24, 40, 0.08);
      --tw-shadow-colored: 0px 4px 6px -2px var(--tw-shadow-color), 0px 12px 16px -4px var(--tw-shadow-color);
      box-shadow: var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow);

      .list_deleteDatasetIcon {
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
  }

  .list_listItemTitle {
    display: flex;
    height: 66px;
    flex-shrink: 0;
    flex-grow: 0;
    align-items: center;
    gap: 0.75rem;
    padding: 14px 14px 0.75rem;

    .list_listItemHeading {
      position: relative;
      height: 2rem;
      flex-grow: 1;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 2rem;

      .list_listItemHeadingContent {
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

    .list_deleteDatasetIcon {
      display: none;
      border-radius: 4px;
      background-position: 50%;
      background-repeat: no-repeat;
      transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
      transition-duration: 0.2s;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  .list_listItemDescription {
    margin-bottom: 0.75rem;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    height: 2.25rem;
    padding-left: 14px;
    padding-right: 14px;
    font-size: 0.75rem;
    line-height: 1rem;
    line-height: 1.5;
    --tw-text-opacity: 1;
    color: rgb(107 114 128 / var(--tw-text-opacity));
  }

  .list_listItemFooter {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.75rem;
    line-height: 1rem;
    --tw-text-opacity: 1;
    color: rgb(107 114 128 / var(--tw-text-opacity));
    min-height: 42px;
    flex-wrap: wrap;
    padding: 0.5rem 14px 10px;

    .list_listItemStats {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
  }
`;

const ListContainer = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
`;
