import { getErrorMessage } from '@app/libs/api';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import XIcon from '@iconify-icons/tabler/x';
import {
  Box,
  Breadcrumbs,
  CircularProgress,
  Container,
  Dialog,
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
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

import { useFetchSegments, useSegments } from '../../contexts/knowledge/segments';
import { getDocumentContent } from '../../libs/knowledge';
import Empty from '../project/icons/empty';
import Viewer from './viewer';

export default function KnowledgeSegments() {
  const { t } = useLocaleContext();
  const params = useParams();

  const { knowledgeId, documentId } = params;

  if (!knowledgeId) {
    throw new Error('knowledgeId is required');
  }

  if (!documentId) {
    throw new Error('documentId is required');
  }

  const navigate = useNavigate();
  const segmentDialogState = usePopupState({ variant: 'dialog', popupId: 'segment' });

  const form = useForm<{ content: string }>({ defaultValues: { content: '' } });
  const [viewType, setViewType] = useState<'SegmentsView' | 'ContentView'>('ContentView');
  const [filename, setFilename] = useState<string>('');

  const { state } = useSegments(knowledgeId, documentId);
  const { loadingRef, dataState } = useFetchSegments(knowledgeId, documentId);
  const segments = dataState?.data?.list || [];

  const { loading } = useRequest(
    async () => {
      if (viewType === 'ContentView' && !filename) {
        const con = await getDocumentContent(knowledgeId, documentId);
        setFilename(con.filename);
        return Promise.resolve(null);
      }

      return Promise.resolve(null);
    },
    {
      refreshDeps: [viewType, filename, knowledgeId, documentId],
      onError: (e) => Toast.error(getErrorMessage(e)),
    }
  );

  if (state.error) throw state.error;

  if (state.loading || dataState.loading) {
    return (
      <Stack
        sx={{
          overflow: 'hidden',
          height: 1,
        }}>
        <Box
          className="center"
          sx={{
            flex: 1,
          }}>
          <CircularProgress size={20} />
        </Box>
      </Stack>
    );
  }

  return (
    <>
      <Stack
        sx={{
          overflow: 'hidden',
          height: 1,
          bgcolor: '#fff',
        }}>
        <Box
          className="between"
          sx={{
            py: 2,
            px: 2.5,
          }}>
          <Stack
            sx={{
              gap: 1,
            }}>
            <Breadcrumbs sx={{ color: '#9CA3AF' }}>
              <Typography sx={{ cursor: 'pointer' }} onClick={() => navigate(`../${knowledgeId}`)}>
                {state?.dataset?.name || t('unnamed')}
              </Typography>
              <Typography sx={{ color: '#030712' }}>{state.document?.name}</Typography>
            </Breadcrumbs>
          </Stack>

          <Box>
            <FormControl>
              <Select
                hiddenLabel
                value={viewType}
                onChange={(event: SelectChangeEvent) =>
                  setViewType(event.target.value as 'SegmentsView' | 'ContentView')
                }>
                <MenuItem value="SegmentsView">{t('segmentsView')}</MenuItem>
                <MenuItem value="ContentView">{t('contentView')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Divider sx={{ borderColor: '#eff1f5' }} />

        {viewType === 'ContentView' && (
          <Stack
            sx={{
              px: 2.5,
              flex: 1,
              height: 0,
              overflow: 'hidden',
              py: 2,
            }}>
            {!loading && filename && (
              <Container sx={{ height: 1 }}>
                <Viewer knowledgeId={knowledgeId} filename={filename} />
              </Container>
            )}

            {loading && (
              <Stack
                sx={{
                  flex: 1,
                  height: 0,
                  py: 2,
                }}>
                <Box
                  className="center"
                  sx={{
                    width: 1,
                    height: 1,
                  }}>
                  <CircularProgress size={20} />
                </Box>
              </Stack>
            )}
          </Stack>
        )}

        {viewType === 'SegmentsView' && (
          <Stack
            sx={{
              px: 2.5,
              flex: 1,
              height: 0,
              overflow: 'auto',
              py: 2,
            }}>
            <Stack
              sx={{
                flex: 1,
              }}>
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
                            let content = item.content || '';
                            try {
                              content = JSON.parse(content || '').content;
                            } catch (e) {
                              // ignore
                            }

                            form.setValue('content', content || '');
                            segmentDialogState.open();
                          }}
                          className="listItem"
                        />
                      );
                    })}
                  </ListContainer>

                  {(dataState.loadingMore || dataState?.data?.next) && (
                    <Box
                      className="center"
                      ref={loadingRef}
                      sx={{
                        width: 1,
                        height: 60,
                      }}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'center',
                        }}>
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
      <Dialog {...bindDialog(segmentDialogState)} maxWidth="md" fullWidth component="form">
        <DialogTitle className="between">
          <Box>{t('knowledge.segments.content')}</Box>

          <IconButton size="small" onClick={segmentDialogState.close}>
            <Box component={Icon} icon={XIcon} />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Controller
            control={form.control}
            name="content"
            rules={{ required: t('validation.fieldRequired') }}
            render={({ field, fieldState }) => {
              return (
                <TextField
                  label={t('knowledge.segments.content')}
                  placeholder={t('knowledge.segments.content')}
                  sx={{ width: 1 }}
                  multiline
                  rows={10}
                  {...field}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                  slotProps={{
                    input: { readOnly: true },
                  }}
                />
              );
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function EmptyDocument() {
  const { t } = useLocaleContext();

  return (
    <Stack
      sx={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 1,
      }}>
      <Empty sx={{ fontSize: 54, color: 'grey.300' }} />
      <Typography
        sx={{
          color: 'text.disabled',
          whiteSpace: 'break-spaces',
          textAlign: 'center',
        }}>
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
  index = undefined,
  content = undefined,
  ...props
}: {
  index?: number;
  content?: string;
} & StackProps) {
  const { t } = useLocaleContext();

  const result = useMemo(() => {
    try {
      return JSON.parse(content || '').content;
    } catch (e) {
      return content;
    }
  }, [content]);

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
      <Box
        sx={{
          height: 90,
        }}>
        <Box className="itemDescription">{result || ''}</Box>
      </Box>
      <Box className="itemFooter">
        <Box className="itemStats">
          <Tag>{`${result?.length} ${t('knowledge.segments.bits')}`}</Tag>
        </Box>
      </Box>
    </SegmentRoot>
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
`;
