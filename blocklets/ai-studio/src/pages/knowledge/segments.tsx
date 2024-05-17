import Close from '@app/pages/project/icons/close';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import ChevronLeftIcon from '@iconify-icons/tabler/chevron-left';
import { SaveRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  StackProps,
  TextField,
  Typography,
  styled,
} from '@mui/material';
import { useRequest } from 'ahooks';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

import { useFetchSegments, useSegments } from '../../contexts/datasets/segments';
import { getErrorMessage } from '../../libs/api';
import { getDocumentContent, uploadDocumentName } from '../../libs/dataset';
import Empty from '../project/icons/empty';

export default function KnowledgeSegments() {
  const { t } = useLocaleContext();
  const params = useParams();
  const { datasetId, documentId } = params;
  const navigate = useNavigate();

  const segmentDialogState = usePopupState({ variant: 'dialog', popupId: 'segment' });
  const documentDialogState = usePopupState({ variant: 'dialog', popupId: 'document' });

  const form = useForm<{ content: string }>({ defaultValues: { content: '' } });
  const [viewType, setViewType] = useState('SegmentsView');
  const [content, setContent] = useState<string[]>([]);

  const { state, refetch } = useSegments(datasetId || '', documentId || '');
  const { loadingRef, dataState } = useFetchSegments(datasetId || '', documentId || '');
  const [readContent, setReadContent] = useState('');
  const isReadOnly = Boolean(readContent);
  const segments = dataState?.data?.list || [];

  const { loading } = useRequest(
    async () => {
      if (viewType === 'ContentView' && !content?.length) {
        const con = await getDocumentContent(datasetId || '', documentId || '');
        setContent((con?.content || []).filter((x) => x));
        return Promise.resolve(null);
      }

      return Promise.resolve(null);
    },
    { refreshDeps: [viewType, content, datasetId, documentId] }
  );

  if (state.error) throw state.error;

  if (state.loading || dataState.loading) {
    return (
      <Stack overflow="hidden" height={1}>
        <Box flex={1} className="center">
          <CircularProgress size={20} />
        </Box>
      </Stack>
    );
  }

  return (
    <>
      <Stack overflow="hidden" height={1} bgcolor="#fff">
        <Box py={2} px={2.5} className="between">
          <Stack gap={1}>
            <Box
              display="flex"
              alignItems="center"
              sx={{ cursor: 'pointer' }}
              onClick={() => {
                navigate(`../${datasetId}`);
              }}>
              <Box component={Icon} icon={ChevronLeftIcon} width={20} />
              <Typography variant="subtitle2" mb={0}>
                {state.document?.name}
              </Typography>
            </Box>

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box>
                <Box display="flex" gap={2} alignItems="center">
                  <Tag>{t(state.document?.type)}</Tag>

                  {viewType === 'SegmentsView' && (
                    <>
                      <Tag>{t('knowledge.auto')}</Tag>
                      <Tag>
                        {dataState?.data?.total} {t('knowledge.segments.segments')}
                      </Tag>
                    </>
                  )}
                </Box>
              </Box>

              {/* <Box display="flex" alignItems="center" gap={2}>
              <SplitButton onRename={documentDialogState.open} />

              <Button
                disabled={!isContentType}
                variant="contained"
                size="small"
                onClick={() => {
                  form.reset({ content: '' });
                  setReadContent('');
                  segmentDialogState.open();
                }}>
                {t('knowledge.segments.create')}
              </Button>
            </Box> */}
            </Box>
          </Stack>

          <Box>
            <FormControl>
              <Select
                hiddenLabel
                value={viewType}
                onChange={(event: SelectChangeEvent) => setViewType(event.target.value)}>
                <MenuItem value="SegmentsView">{t('segmentsView')}</MenuItem>
                <MenuItem value="ContentView">{t('contentView')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Divider />

        {viewType === 'ContentView' && (
          <>
            {!loading && (
              <Stack flex={1} height={0} py={2}>
                <Box width={1} height={1}>
                  <Box
                    sx={{
                      border: '1px solid rgba(29,28,35,.12)',
                      borderRadius: 0.5,
                      display: 'flex',
                      flexDirection: 'column',
                      p: 2,
                      m: '0 24px',
                      height: 'calc(100% - 24px)',
                      position: 'relative',
                      overflow: 'auto',
                    }}>
                    {content.map((x) => {
                      return (
                        <Box key={x} mb={2} sx={{ wordBreak: 'break-word', whiteSpace: 'break-spaces' }}>{`${x}`}</Box>
                      );
                    })}
                  </Box>
                </Box>
              </Stack>
            )}

            {loading && (
              <Stack flex={1} height={0} py={2}>
                <Box width={1} height={1} className="center">
                  <CircularProgress size={20} />
                </Box>
              </Stack>
            )}
          </>
        )}

        {viewType === 'SegmentsView' && (
          <Stack px={2.5} flex={1} height={0} overflow="auto" py={2}>
            <Stack flex={1}>
              {!segments?.length && <EmptyDocument />}

              {segments?.length && (
                <>
                  <ListContainer gap={1.25}>
                    {segments.map((item, index) => {
                      return (
                        <SegmentsItem
                          key={item.id}
                          index={index + 1}
                          content={item.content}
                          onClick={() => {
                            form.setValue('content', item.content || '');
                            setReadContent(item.content || '');
                            segmentDialogState.open();
                          }}
                          className="listItem"
                        />
                      );
                    })}
                  </ListContainer>

                  {(dataState.loadingMore || dataState?.data?.next) && (
                    <Box width={1} height={60} className="center" ref={loadingRef}>
                      <Box display="flex" justifyContent="center">
                        <CircularProgress size={14} />
                      </Box>
                    </Box>
                  )}
                </>
              )}
            </Stack>
          </Stack>
        )}
      </Stack>

      <Dialog {...bindDialog(segmentDialogState)} maxWidth="sm" fullWidth component="form">
        <DialogTitle className="between">
          <Box>{t('knowledge.segments.content')}</Box>

          <IconButton size="small" onClick={segmentDialogState.close}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Controller
            control={form.control}
            name="content"
            rules={{
              required: t('validation.fieldRequired'),
            }}
            render={({ field, fieldState }) => {
              return (
                <TextField
                  label={t('knowledge.segments.content')}
                  placeholder={t('knowledge.segments.content')}
                  sx={{ width: 1 }}
                  multiline
                  rows={10}
                  InputProps={{ readOnly: isReadOnly }}
                  {...field}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                />
              );
            }}
          />
        </DialogContent>
      </Dialog>

      <UpdateDocumentName
        onUpdate={refetch}
        datasetId={datasetId || ''}
        documentId={state.document?.id || ''}
        name={state.document?.name || ''}
        documentDialogState={documentDialogState}
      />
    </>
  );
}

function EmptyDocument() {
  const { t } = useLocaleContext();

  return (
    <Stack flex={1} justifyContent="center" alignItems="center" gap={1}>
      <Empty sx={{ fontSize: 54, color: 'grey.300' }} />
      <Typography color="text.disabled" sx={{ whiteSpace: 'break-spaces', textAlign: 'center' }}>
        {t('knowledge.segments.empty')}
      </Typography>
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

export function SegmentsItem({
  index,
  content,
  ...props
}: {
  index?: number;
  content?: string;
} & StackProps) {
  const { t } = useLocaleContext();

  return (
    <SegmentRoot {...props}>
      <Box className="itemTitle">
        <Box className="itemHeading">
          <Box className="headingContent">{`# ${index}`}</Box>
        </Box>

        {/* <Box className="deleteIcon">
          {!isReadOnly && (
            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                onEdit(e);
              }}>
              <Edit sx={{ fontSize: '16px' }} />
            </IconButton>
          )}

          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}>
            <Delete sx={{ fontSize: '16px' }} />
          </IconButton>
        </Box> */}
      </Box>

      <Box height={90}>
        <Box className="itemDescription">{content || ''}</Box>
      </Box>

      <Box className="itemFooter">
        <Box className="itemStats">
          <Tag>{`${content?.length} ${t('knowledge.segments.bits')}`}</Tag>
        </Box>
      </Box>
    </SegmentRoot>
  );
}

function UpdateDocumentName({
  datasetId,
  documentId,
  name,
  documentDialogState,
  onUpdate,
}: {
  datasetId: string;
  documentId: string;
  name: string;
  documentDialogState: any;
  onUpdate: () => any;
}) {
  const { t } = useLocaleContext();
  const form = useForm<{ name: string }>({ defaultValues: { name } });

  return (
    <Dialog
      {...bindDialog(documentDialogState)}
      maxWidth="sm"
      fullWidth
      component="form"
      onSubmit={form.handleSubmit(async (data) => {
        try {
          await uploadDocumentName(datasetId || '', documentId || '', data);
          form.reset({ name: '' });

          onUpdate();
          documentDialogState.close();
        } catch (error) {
          Toast.error(getErrorMessage(error));
        }
      })}>
      <DialogTitle className="between">
        <Box>{t('knowledge.documents.update')}</Box>

        <IconButton size="small" onClick={documentDialogState.close}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <TextField label={t('knowledge.documents.name')} sx={{ width: 1 }} {...form.register('name')} />
      </DialogContent>

      <DialogActions>
        <Button onClick={documentDialogState.close}>{t('cancel')}</Button>

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
  );
}

const SegmentRoot = styled(Stack)`
  display: flex;
  min-height: 160px;
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
    background: rgba(229, 231, 235, 0.5);
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
    background: rgb(249 250 251);

    &:hover {
      box-shadow:
        0px 4px 6px -2px rgba(16, 24, 40, 0.03),
        0px 12px 16px -4px rgba(16, 24, 40, 0.08);

      .deleteIcon {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2;
      }
    }
  }

  .itemTitle {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 14px 14px 0;

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
    -webkit-line-clamp: 4;
    height: 88px;
    padding: 14px;
    font-size: 0.75rem;
    line-height: 1.5;
    color: rgb(107, 114, 128);
    word-wrap: break-word;
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
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
`;
