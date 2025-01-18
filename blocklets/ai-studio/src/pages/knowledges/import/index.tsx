import DatasetDocument from '@api/store/models/dataset/document';
import LoadingButton from '@app/components/loading/loading-button';
import { useIsAdmin } from '@app/contexts/session';
import UploaderProvider, { useUploader } from '@app/contexts/uploader';
import { AIGNE_RUNTIME_MOUNT_POINT } from '@app/libs/constants';
import { getDiscussionStatus } from '@app/libs/discussion';
import {
  CreateDiscussionItem,
  createCrawlDocument,
  createCustomDocument,
  createDiscussionDocument,
  createFileDocument,
  getDocument,
  updateCustomDocument,
} from '@app/libs/knowledge';
import { getHasCrawlSecret } from '@app/libs/secret';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import ArrowBarToUpIcon from '@iconify-icons/tabler/arrow-bar-to-up';
import FileIcon from '@iconify-icons/tabler/file';
import PencilIcon from '@iconify-icons/tabler/pencil';
import TrashIcon from '@iconify-icons/tabler/trash';
import XIcon from '@iconify-icons/tabler/x';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Theme,
  Tooltip,
  Typography,
  styled,
  useMediaQuery,
} from '@mui/material';
import { useRequest } from 'ahooks';
import bytes from 'bytes';
import { Suspense, forwardRef, useMemo, useRef, useState } from 'react';
import { joinURL, withQuery } from 'ufo';

import Discuss from '../../project/icons/discuss';
import DiscussView from '../discuss';
import { DocumentIcon } from '../document/list';
import {
  CrawlSettingsProps,
  CrawlType,
  CreateKnowledgeParams,
  CustomInputProps,
  CustomType,
  FileType,
  SourceType,
  SourceTypeSelectType,
} from './type';

function createKnowledge(knowledgeId: string, params: CreateKnowledgeParams, documentId?: string) {
  const { sourceType, ...rest } = params;

  switch (sourceType) {
    case 'file':
      return createFileDocument(knowledgeId, {
        size: rest.file?.runtime?.size!,
        name: rest.file?.runtime?.originFileName!,
        filename: rest.file?.runtime?.hashFileName!,
      });
    case 'custom':
      return documentId
        ? updateCustomDocument(knowledgeId, documentId, {
            title: rest.custom?.title!,
            content: rest.custom?.content!,
          })
        : createCustomDocument(knowledgeId, {
            title: rest.custom?.title!,
            content: rest.custom?.content!,
          });
    case 'url':
      return createCrawlDocument(knowledgeId, rest.crawl!);
    case 'discuss':
      return createDiscussionDocument(knowledgeId, rest.discussion!);
    default:
      throw new Error(`Unsupported source type: ${sourceType}`);
  }
}

export default function ImportKnowledge({
  documentId,
  knowledgeId,
  onClose,
  onSubmit,
}: {
  documentId?: string;
  knowledgeId: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [sourceType, setSourceType] = useState<SourceType>('file');
  const { t } = useLocaleContext();
  const providerRef = useRef<HTMLDivElement>(null);

  const isAdmin = useIsAdmin();
  const sourceOptions = (
    [
      {
        id: 'file',
        label: t('knowledge.import'),
        icon: <Box component={Icon} icon={FileIcon} width={14} height={14} borderRadius={1} className="center" />,
        disabled: !!documentId,
      },
      {
        id: 'custom',
        label: t('knowledge.custom'),
        icon: <Box component={Icon} icon={PencilIcon} width={14} height={14} borderRadius={1} className="center" />,
      },
      getDiscussionStatus() && isAdmin
        ? {
            id: 'discuss',
            label: t('knowledge.discussKit'),
            icon: (
              <Box width={14} height={14} borderRadius={1} className="center">
                <Discuss sx={{ width: '100%', height: '100%' }} />
              </Box>
            ),
            disabled: !!documentId,
          }
        : null,
      {
        id: 'url',
        label: t('knowledge.crawl'),
        icon: (
          <Box component={Icon} icon="zondicons:network" width={14} height={14} borderRadius={1} className="center" />
        ),
        disabled: !!documentId,
      },
    ] as SourceTypeSelectType[]
  ).filter(Boolean);

  const { loading } = useRequest(async () => {
    if (!documentId) return;
    const { document } = await getDocument(knowledgeId, documentId);
    setCustom({ title: document.name, content: document.content });
    setSourceType('custom');
  });

  const [custom, setCustom] = useState<CustomType>();
  const [discussion, setDiscussion] = useState<CreateDiscussionItem[]>([]);
  const [crawl, setCrawl] = useState<CrawlType>({ provider: 'jina' });

  const handleSubmit = async () => {
    // @ts-ignore
    const uploader = providerRef?.current?.getUploader();
    try {
      let file;
      if (sourceType === 'file') {
        const { successful, failed } = await uploader.upload();
        file = successful[0]?.responseResult?.data;

        if (!successful?.length || failed?.length || !file?.id) {
          Toast.warning(t('knowledge.importKnowledge.uploadFailed'));
          return;
        }
      }

      const params = {
        sourceType,
        ...(sourceType === 'file' && { file }),
        ...(sourceType === 'custom' && { custom }),
        ...(sourceType === 'url' && { crawl }),
        ...(sourceType === 'discuss' && { discussion }),
      };

      await createKnowledge(knowledgeId, params, documentId);
      Toast.success(t('knowledge.createKnowledgeSuccess'));
      onSubmit();
    } catch (error) {
      Toast.error(error?.message);
    }
  };

  const disabled = useMemo(() => {
    if (sourceType === 'file') return false; // will be set by submit
    if (sourceType === 'custom') return !(custom?.title || '').trim() || !(custom?.content || '').trim();
    if (sourceType === 'url') return !(crawl.url || '').trim() || !(crawl.provider || '').trim();
    if (sourceType === 'discuss') return discussion.length === 0;
    return false;
  }, [sourceType, custom, crawl, discussion]);

  const url = withQuery(joinURL(AIGNE_RUNTIME_MOUNT_POINT, '/api/datasets/upload-document'), { knowledgeId });
  return (
    <Dialog
      open
      fullWidth
      maxWidth="xl"
      PaperProps={{ sx: { height: '100%' } }}
      fullScreen={useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'))}>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 500 }}>
            {documentId
              ? t('updateObject', { object: t('knowledge.knowledge') })
              : t('createObject', { object: t('knowledge.knowledge') })}
          </Typography>

          <IconButton size="small" onClick={onClose}>
            <Box component={Icon} icon={XIcon} />
          </IconButton>
        </Box>
      </DialogTitle>

      {loading && (
        <Box sx={{ height: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && (
        <UploaderDialogContent>
          <Stack gap={2.5} height={1}>
            <Stack>
              <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 500, mb: 0.5 }}>
                {t('knowledge.importKnowledge.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('knowledge.importKnowledge.description')}
              </Typography>
            </Stack>

            <SourceTypeSelect value={sourceType} onChange={setSourceType} options={sourceOptions} />

            <Box flexGrow={1} pb={1.25}>
              <Suspense>
                {sourceType === 'file' ? (
                  <UploaderProvider
                    ref={providerRef}
                    popup={false}
                    dropTargetProps={{}}
                    plugins={[]}
                    apiPathProps={{
                      uploader: url,
                      disableMediaKitPrefix: true,
                      disableAutoPrefix: true,
                    }}
                    restrictions={{
                      maxFileSize: (Number(window.blocklet?.preferences?.uploadFileLimit) || 10) * 1024 * 1024,
                      allowedFileTypes: ['.md', '.pdf', '.doc', '.docx', '.txt', '.json'],
                    }}
                    dashboardProps={{
                      fileManagerSelectionType: 'files',
                      hideUploadButton: true,
                      hideRetryButton: true,
                      hideProgressAfterFinish: true,
                      note: t('knowledge.importKnowledge.support'),
                    }}
                  />
                ) : sourceType === 'custom' ? (
                  <CustomView
                    title={custom?.title}
                    content={custom?.content}
                    onTitleChange={(value) => setCustom((prev) => ({ ...(prev || {}), title: value }))}
                    onContentChange={(value) => setCustom((prev) => ({ ...(prev || {}), content: value }))}
                    onSubmit={handleSubmit}
                  />
                ) : sourceType === 'url' ? (
                  <CrawlView
                    provider={crawl.provider}
                    url={crawl.url}
                    onProviderChange={(value) => setCrawl((prev) => ({ ...(prev || {}), provider: value }))}
                    onUrlChange={(value) => setCrawl((prev) => ({ ...(prev || {}), url: value }))}
                    onSubmit={handleSubmit}
                  />
                ) : sourceType === 'discuss' ? (
                  <DiscussView onChange={setDiscussion} />
                ) : null}
              </Suspense>
            </Box>
          </Stack>
        </UploaderDialogContent>
      )}

      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          {t('cancel')}
        </Button>
        <LoadingButton variant="contained" onClick={handleSubmit} disabled={disabled}>
          {documentId ? t('update') : t('create')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

interface SourceTypeSelectProps {
  value: SourceType;
  onChange: (value: SourceType) => void;
  options: SourceTypeSelectType[];
}

const SourceTypeSelect = ({ value, onChange, options }: SourceTypeSelectProps) => {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {options.map((option) => (
        <Button
          key={option.id}
          variant="outlined"
          onClick={() => onChange(option.id)}
          disabled={option.disabled}
          startIcon={option.icon ?? null}
          sx={{
            border: value === option.id ? '1px solid #3B82F6' : undefined,
            color: value === option.id ? '#3B82F6' : undefined,
            bgcolor: value === option.id ? '#EFF6FF' : undefined,

            '.MuiButton-startIcon': {
              mr: 0.5,
            },
          }}>
          {option.label}
        </Button>
      ))}
    </Box>
  );
};

interface FileViewProps {
  fileName?: string;
  size?: number;
  onChange: (value?: FileType) => void;
}

export const FileView = forwardRef<HTMLDivElement, FileViewProps>(({ fileName, size, onChange }, ref) => {
  const { t } = useLocaleContext();

  const [isDraggingOver] = useState(false);
  const uploaderRef = useUploader();

  return (
    <Stack>
      <Box
        ref={ref}
        sx={{
          bgcolor: '#F9FAFB',
          border: isDraggingOver ? '1px dashed #007bff' : '1px dashed #EFF1F5',
          borderRadius: 1,
          height: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          cursor: 'pointer',
        }}
        onClick={() => {
          const uploader = uploaderRef?.current?.getUploader();
          uploader?.open();
          uploader.onceUploadSuccess(async ({ response }: any) => {
            onChange(response?.data);
          });
        }}>
        <Box display="flex" alignItems="center" gap={1} color="#4B5563">
          <Box component={Icon} icon={ArrowBarToUpIcon} />
          <Typography sx={{ fontWeight: 500 }}>{t('knowledge.importKnowledge.fileImport')}</Typography>
        </Box>

        <Typography variant="subtitle5" sx={{ fontSize: 13 }}>
          {t('knowledge.importKnowledge.dragAndDrop')}
        </Typography>
      </Box>

      {fileName && (
        <Stack
          direction="row"
          gap={1}
          justifyContent="space-between"
          alignItems="center"
          sx={{
            border: '1px solid rgba(6,7,9, 0.10)',
            p: '8px 10px',
            overflow: 'hidden',
            background: '#fff',
            borderRadius: '8px',
            mt: 2,
          }}>
          <Stack direction="row" gap={1} alignItems="center">
            <DocumentIcon document={{ name: fileName, type: 'file' } as DatasetDocument} />
            <Box>
              <Box sx={{ color: 'rgba(6, 7, 9, 0.8)', fontSize: 14 }}>{fileName}</Box>
              <Box sx={{ color: 'rgba(6, 7, 9, 0.5)', fontSize: 12 }}>{bytes(size ?? 0)}</Box>
            </Box>
          </Stack>

          <IconButton size="small" onClick={() => onChange(undefined)}>
            <Box component={Icon} icon={TrashIcon} sx={{ color: 'rgba(6, 7, 9, 0.5)', fontSize: 14 }} />
          </IconButton>
        </Stack>
      )}
    </Stack>
  );
});

const CustomView = ({
  title,
  content,
  onTitleChange,
  onContentChange,
  onSubmit,
}: CustomInputProps & { onSubmit: () => void }) => {
  const { t } = useLocaleContext();

  return (
    <Stack
      gap={2.5}
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box
          component="label"
          sx={{
            color: '#111827',
            fontSize: '14px',
            fontWeight: 500,
          }}>
          {t('title')}
        </Box>
        <StyledTextField
          fullWidth
          placeholder={t('title')}
          value={title}
          onChange={(e) => onTitleChange?.(e.target.value)}
          variant="outlined"
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box
          component="label"
          sx={{
            color: '#111827',
            fontSize: '14px',
            fontWeight: 500,
          }}>
          {t('content')}
        </Box>
        <StyledTextField
          fullWidth
          multiline
          rows={12}
          placeholder={t('content')}
          value={content}
          onChange={(e) => onContentChange?.(e.target.value)}
          variant="outlined"
          className="multiline"
        />
      </Box>
    </Stack>
  );
};

const CrawlView = ({
  provider,
  onProviderChange,
  url,
  onUrlChange,
  onSubmit,
}: CrawlSettingsProps & { onSubmit: () => void }) => {
  const { t } = useLocaleContext();
  const providers = [
    { id: 'jina', label: 'Jina Reader' },
    { id: 'firecrawl', label: 'Firecrawl' },
  ];

  const { loading, data } = useRequest(getHasCrawlSecret);

  return (
    <Stack
      gap={2.5}
      component="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}>
      <Stack gap={2.5} flexDirection="row" alignItems="center">
        <Typography
          component="label"
          sx={{
            color: '#111827',
            fontSize: '14px',
            fontWeight: 500,
            display: 'block',
          }}>
          {t('knowledge.importKnowledge.provider')}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {providers.map((item) => (
            <Button
              key={item.id}
              variant="outlined"
              onClick={() => onProviderChange(item.id as 'jina' | 'firecrawl')}
              sx={{
                border: provider === item.id ? '1px solid #3B82F6' : undefined,
                color: provider === item.id ? '#3B82F6' : undefined,
                bgcolor: provider === item.id ? '#EFF6FF' : undefined,
              }}>
              {item.label}
            </Button>
          ))}
        </Box>
      </Stack>

      <Box>
        <Typography
          component="label"
          sx={{
            color: '#111827',
            fontSize: '14px',
            fontWeight: 500,
            display: 'block',
            mb: 1,
          }}>
          {t('knowledge.importKnowledge.url')}
        </Typography>

        <Tooltip
          title={
            loading || data?.[provider as 'jina' | 'firecrawl']
              ? undefined
              : t('knowledge.importKnowledge.apiKeyNotSet')
          }>
          <StyledTextField
            fullWidth
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder={t('knowledge.importKnowledge.url')}
            variant="outlined"
            disabled={loading || !data?.[provider as 'jina' | 'firecrawl']}
            InputProps={{
              endAdornment: loading ? <CircularProgress size={16} /> : null,
            }}
            sx={{
              '.MuiOutlinedInput-root': {
                border: loading || data?.[provider as 'jina' | 'firecrawl'] ? undefined : '1px solid #E11D48',
              },
            }}
          />
        </Tooltip>
      </Box>
    </Stack>
  );
};

const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    gap: '6px',
    width: '100%',
    fontSize: '14px',
    paddingLeft: '6px',

    '& fieldset': {
      borderColor: '#EFF1F5',
      borderWidth: '1px',
    },
    '&:hover fieldset': {
      borderColor: '#EFF1F5',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#EFF1F5',
    },
  },
  '& .MuiInputBase-input': {
    padding: 0,
  },

  '& .MuiInputBase-multiline': {
    padding: '9px 6px !important',
  },
});

const UploaderDialogContent = styled(DialogContent)`
  .uploader-container {
    width: 100%;
  }

  .uppy-Dashboard-inner {
    width: 100% !important;
    background: #f9fafb;
    border-color: #eff1f5;

    .uppy-Dashboard-AddFiles {
      border: 0;

      .uppy-Dashboard-AddFiles-title {
        color: #4b5563;
        font-size: 16px;
      }

      .uppy-Dashboard-AddFiles-list {
        display: none;
      }

      .uppy-Dashboard-AddFiles-info {
        position: static;
        padding-top: 0;
      }
    }
  }

  .uppy-Dashboard-note {
    color: #9ca3af;
    font-size: 13px;
  }
`;
