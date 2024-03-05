import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { SaveRounded } from '@mui/icons-material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Breadcrumbs,
  Button,
  ButtonGroup,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grow,
  IconButton,
  MenuItem,
  MenuList,
  Paper,
  Popover,
  Popper,
  Stack,
  StackProps,
  TextField,
  Typography,
  styled,
} from '@mui/material';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';

import PromiseLoadingButton from '../../components/promise-loading-button';
import { useSegments } from '../../contexts/datasets/segments';
import { getErrorMessage } from '../../libs/api';
import { uploadDocumentName } from '../../libs/dataset';
import Delete from '../project/icons/delete';
import Edit from '../project/icons/edit';
import Empty from '../project/icons/empty';

export default function KnowledgeSegments() {
  const { t } = useLocaleContext();
  const params = useParams();
  const { datasetId, documentId } = params;

  const segmentDialogState = usePopupState({ variant: 'dialog', popupId: 'segment' });
  const documentDialogState = usePopupState({ variant: 'dialog', popupId: 'document' });

  const form = useForm<{ content: string }>({ defaultValues: { content: '' } });

  const { state, refetch, create, update } = useSegments(datasetId || '', documentId || '');
  const [readContent, setReadContent] = useState('');
  const [currentSegment, setSegment] = useState('');
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [segmentId, setSegmentId] = useState('');
  const isReadOnly = Boolean(readContent);

  useEffect(() => {
    if (!segmentDialogState.isOpen) {
      setSegmentId('');
    }
  }, [segmentDialogState.isOpen]);

  if (state.error) throw state.error;

  if (state.loading) {
    return (
      <Box flex={1} display="flex" justifyContent="center" alignItems="center">
        <CircularProgress size={20} />
      </Box>
    );
  }

  const isContentType = state.document?.type === 'text';

  return (
    <>
      <>
        <Stack gap={3} py={2} px={3}>
          <Breadcrumbs sx={{ a: { color: 'rgba(29,28,35,.35)', textDecoration: 'auto' } }}>
            <Link color="inherit" to="../../knowledge">
              {t('knowledge.menu')}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}>
                <Box>{state.document?.name}</Box>

                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    documentDialogState.open();
                  }}>
                  <Edit sx={{ fontSize: '16px' }} />
                </IconButton>
              </Box>

              <Box display="flex" gap={2} alignItems="center" mt={1}>
                <Tag>{state.document?.type}</Tag>
                <Tag>{t('knowledge.auto')}</Tag>
                <Tag>
                  {state?.segments?.length} {t('knowledge.segments.segments')}
                </Tag>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={2}>
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
            </Box>
          </Box>
        </Stack>

        <Divider />

        <Stack px={3} flex={1} height={0}>
          <Box sx={{ margin: '30px 0 20px', fontSize: '18px', fontWeight: 600, lineHeight: '24px' }}>
            {t('knowledge.segments.segments')}
          </Box>

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
                        segmentDialogState.open();
                      }}
                      onEdit={() => {
                        form.setValue('content', item.content || '');
                        setSegmentId(item.id);
                        segmentDialogState.open();
                      }}
                      onDelete={(e) => {
                        setSegment(item.id);
                        setAnchorEl(e.currentTarget);
                      }}
                      className="listItem"
                    />
                  );
                })}
              </ListContainer>
            )}
          </Stack>
        </Stack>
      </>

      <Dialog
        {...bindDialog(segmentDialogState)}
        maxWidth="sm"
        fullWidth
        component="form"
        onSubmit={form.handleSubmit(async ({ content }) => {
          if (segmentId) {
            await update(segmentId, content);
          } else {
            await create(content);
          }

          form.reset({ content: '' });
          await refetch();
          segmentDialogState.close();
        })}>
        <DialogTitle>{t('knowledge.segments.content')}</DialogTitle>

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

        {!isReadOnly && (
          <DialogActions>
            <Button onClick={segmentDialogState.close}>{t('cancel')}</Button>

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

      <DeleteSegment
        datasetId={datasetId || ''}
        documentId={state.document?.id || ''}
        anchorEl={anchorEl}
        setAnchorEl={setAnchorEl}
        currentSegment={currentSegment}
      />

      <UpdateDocumentName
        datasetId={datasetId || ''}
        documentId={state.document?.id || ''}
        name={state.document?.name || ''}
        onUpdate={refetch}
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

function SegmentsItem({
  index,
  content,
  onDelete,
  onEdit,
  ...props
}: {
  index?: number;
  content?: string;
  onDelete: (e: React.MouseEvent<HTMLButtonElement>) => any;
  onEdit: (e: React.MouseEvent<HTMLButtonElement>) => any;
} & StackProps) {
  const { t } = useLocaleContext();

  return (
    <SegmentRoot {...props}>
      <Box className="itemTitle">
        <Box className="itemHeading">
          <Box className="headingContent">{`# ${index}`}</Box>
        </Box>

        <Box className="deleteIcon">
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              onEdit(e);
            }}>
            <Edit sx={{ fontSize: '16px' }} />
          </IconButton>

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

function SplitButton({ onRename }: { onRename: () => any }) {
  const { t } = useLocaleContext();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);

  const handleMenuItemClick = (item: string) => {
    if (item === 'rename') {
      onRename();
    }

    setOpen(false);
  };

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }
    setOpen(false);
  };

  return (
    <>
      <ButtonGroup size="small" ref={anchorRef}>
        <Button>{t('knowledge.configure')}</Button>
        <Button size="small" onClick={handleToggle}>
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Popper
        sx={{ zIndex: 1 }}
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        transition
        disablePortal
        placement="bottom-end">
        {({ TransitionProps }) => (
          <Grow {...TransitionProps}>
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList id="split-button-menu" autoFocusItem>
                  <MenuItem onClick={() => handleMenuItemClick('rename')}>{t('knowledge.rename')}</MenuItem>
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
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
      <DialogTitle>{t('knowledge.documents.update')}</DialogTitle>

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

function DeleteSegment({
  datasetId,
  documentId,
  anchorEl,
  setAnchorEl,
  currentSegment,
}: {
  datasetId: string;
  documentId: string;
  currentSegment: string;
  anchorEl: any;
  setAnchorEl: any;
}) {
  const { t } = useLocaleContext();
  const { refetch, remove } = useSegments(datasetId || '', documentId || '');

  const open = Boolean(anchorEl);
  const id = open ? 'simple-popover' : undefined;

  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={() => setAnchorEl(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
      <DialogTitle>{t('knowledge.segments.deleteTitle')}</DialogTitle>

      <DialogContent sx={{ fontSize: '14px', lineHeight: '22px' }}>
        {t('knowledge.segments.deleteDescription')}
      </DialogContent>

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
