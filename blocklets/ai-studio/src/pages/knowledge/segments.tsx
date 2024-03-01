import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { SaveRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Breadcrumbs,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Popover,
  Stack,
  StackProps,
  TextField,
  Typography,
  styled,
} from '@mui/material';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';

import PromiseLoadingButton from '../../components/promise-loading-button';
import { useSegments } from '../../contexts/dataset-segments';
import Delete from '../project/icons/delete';
import Empty from '../project/icons/empty';

export default function KnowledgeSegments() {
  const { t } = useLocaleContext();
  const params = useParams();
  const { datasetId, documentId } = params;

  const dialogState = usePopupState({ variant: 'dialog' });
  const form = useForm<{ content: string }>({ defaultValues: { content: '' } });

  const { state, create, refetch, remove } = useSegments(datasetId || '', documentId || '');
  const [readContent, setReadContent] = useState('');
  const [currentSegment, setSegment] = useState('');
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  if (state.error) throw state.error;

  if (state.loading) {
    return (
      <Box flex={1} display="flex" justifyContent="center" alignItems="center">
        <CircularProgress size={20} />
      </Box>
    );
  }

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  return (
    <>
      <>
        <Stack gap={3} py={2} px={3}>
          <Breadcrumbs
            sx={{
              a: {
                color: 'rgba(29,28,35,.35)',
                textDecoration: 'auto',
              },
            }}>
            <Link color="inherit" to="../../knowledge">
              Knowledge
            </Link>

            <Link color="inherit" to={`../${datasetId}`}>
              {state.dataset?.name}
            </Link>

            <Typography color="text.primary">{state.document?.name}</Typography>
          </Breadcrumbs>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Box
                sx={{
                  fontSize: '20px',
                  fontWeight: 600,
                  lineHeight: '28px',
                }}>
                {state.document?.name}
              </Box>

              <Box display="flex" gap={2} alignItems="center" mt={1}>
                <Tag>{state.document?.type}</Tag>
                <Tag>Auto segmentation</Tag>
                <Tag>{state?.segments?.length} Segment</Tag>
              </Box>
            </Box>

            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setReadContent('');
                dialogState.open();
              }}>
              Create Segment
            </Button>
          </Box>
        </Stack>

        <Divider />

        <Stack px={3} flex={1} height={0}>
          <Box sx={{ margin: '30px 0 20px', fontSize: '18px', fontWeight: 600, lineHeight: '24px' }}>Segments</Box>
          <Stack flex={1}>
            {!state?.segments?.length && <EmptyDocument />}

            {state?.segments?.length && (
              <ListContainer gap={{ xs: 2, sm: 3 }}>
                {state?.segments.map((item) => {
                  return (
                    <SegmentsItem
                      key={item.id}
                      index={item.index}
                      content={item.content}
                      onClick={() => {
                        form.setValue('content', item.content || '');
                        setReadContent(item.content || '');
                        dialogState.open();
                      }}
                      onDelete={(e) => {
                        setSegment(item.id);
                        setAnchorEl(e.currentTarget);
                      }}
                      className="list_listItem"
                      sx={{ '&:focus-visible': { outline: 0 } }}
                    />
                  );
                })}
              </ListContainer>
            )}
          </Stack>
        </Stack>
      </>

      <Dialog
        {...bindDialog(dialogState)}
        maxWidth="sm"
        fullWidth
        component="form"
        onSubmit={form.handleSubmit(async ({ content }) => {
          await create(content);
          await refetch();
          dialogState.close();
        })}>
        <DialogTitle>{t('Segment Content')}</DialogTitle>

        <DialogContent>
          <TextField
            label={t('Segment Content')}
            placeholder="Please Input Content"
            sx={{ width: 1 }}
            multiline
            rows={10}
            InputProps={{ readOnly: Boolean(readContent) }}
            {...form.register('content')}
          />
        </DialogContent>

        {!readContent && (
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
        )}
      </Dialog>

      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}>
        <DialogTitle>{t('Confirm whether to delete')}</DialogTitle>

        <DialogContent>This operation will not be reversed</DialogContent>

        <DialogActions>
          <Button size="small" onClick={() => setAnchorEl(null)}>
            {t('cancel')}
          </Button>

          <PromiseLoadingButton
            size="small"
            variant="contained"
            color="error"
            onClick={async () => {
              await remove(currentSegment);
              await refetch();
              setAnchorEl(null);
            }}>
            {t('delete')}
          </PromiseLoadingButton>
        </DialogActions>
      </Popover>
    </>
  );
}

function EmptyDocument() {
  const { t } = useLocaleContext();

  return (
    <Stack flex={1} justifyContent="center" alignItems="center" gap={1}>
      <Empty sx={{ fontSize: 54, color: 'grey.300' }} />
      <Typography color="text.disabled">{t('No Segment yet')}</Typography>
    </Stack>
  );
}

function Tag({ children }: { children: any }) {
  return (
    <Box
      sx={{
        borderRadius: '6px',
        fontWeight: 500,
        background: 'rgba(139,139,149,0.15)',
        color: 'rgba(75,74,88,1)',
        padding: '2px 8px',
        fontSize: '12px',
        height: '20px',
        lineHeight: '16px',
      }}>
      {children}
    </Box>
  );
}

function SegmentsItem({
  index,
  content,
  onDelete,
  ...props
}: { index?: number; content?: string; onDelete: (e: React.MouseEvent<HTMLButtonElement>) => any } & StackProps) {
  return (
    <SegmentRoot {...props}>
      <Box className="list_listItemTitle">
        <Box className="list_listItemHeading">
          <Box className="list_listItemHeadingContent">{`# ${index}`}</Box>
        </Box>

        <Box className="list_deleteDatasetIcon">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}>
            <Delete sx={{ fontSize: '16px' }} />
          </IconButton>
        </Box>
      </Box>

      <Box height={90}>
        <Box className="list_listItemDescription">{content || ''}</Box>
      </Box>

      <Box className="list_listItemFooter">
        <Box className="list_listItemStats">
          <Tag>{`${content?.length} Bits`}</Tag>
        </Box>
      </Box>
    </SegmentRoot>
  );
}

const SegmentRoot = styled(Stack)`
  display: flex;
  height: 200px;
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
      --tw-bg-opacity: 1;
      background-color: rgb(255 255 255 / var(--tw-bg-opacity));
      background-position: 50%;
      background-repeat: no-repeat;
      transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
      transition-duration: 0.2s;
      transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  .list_listItemDescription {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    padding-left: 14px;
    padding-right: 14px;
    font-size: 0.75rem;
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
`;
