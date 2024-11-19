import LoadingButton from '@app/components/loading/loading-button';
import { useIsAdmin } from '@app/contexts/session';
import UploaderProvider, { useUploader } from '@app/contexts/uploader';
import { AIGNE_RUNTIME_MOUNT_POINT } from '@app/libs/constants';
import {
  CreateDiscussionItem,
  createCrawlDocument,
  createCustomDocument,
  createDiscussionDocument,
  createFileDocument,
} from '@app/libs/dataset';
import { getDiscussionStatus } from '@app/libs/discussion';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import ArrowBarToUpIcon from '@iconify-icons/tabler/arrow-bar-to-up';
import DatabaseIcon from '@iconify-icons/tabler/database';
import FileIcon from '@iconify-icons/tabler/file-text';
import PencilIcon from '@iconify-icons/tabler/pencil';
import XIcon from '@iconify-icons/tabler/x';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Theme,
  Typography,
  styled,
  useMediaQuery,
} from '@mui/material';
import { Suspense, useMemo, useState } from 'react';
import { joinURL, withQuery } from 'ufo';

import Discuss from '../../project/icons/discuss';
import DiscussView from '../discuss';
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

function createKnowledge(knowledgeId: string, params: CreateKnowledgeParams) {
  const { sourceType, ...rest } = params;

  switch (sourceType) {
    case 'file':
      return createFileDocument(knowledgeId, {
        size: rest.file?.runtime?.size!,
        name: rest.file?.runtime?.originFileName!,
        hash: rest.file?.runtime?.hashFileName!,
        type: rest.file?.runtime?.type!,
        relativePath: rest.file?.runtime?.relativePath!,
      });
    case 'custom':
      return createCustomDocument(knowledgeId, {
        title: rest.custom?.title!,
        content: rest.custom?.content!,
      });
    case 'crawl':
      return createCrawlDocument(knowledgeId, rest.crawl!);
    case 'discuss':
      return createDiscussionDocument(knowledgeId, rest.discussion!);
    default:
      throw new Error(`Unsupported source type: ${sourceType}`);
  }
}

export default function ImportKnowledge({
  knowledgeId,
  onClose,
  onSubmit,
}: {
  knowledgeId: string;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const [sourceType, setSourceType] = useState<SourceType>('file');
  const { t } = useLocaleContext();

  const isAdmin = useIsAdmin();
  const sourceOptions = (
    [
      {
        id: 'file',
        label: 'Import from file',
        icon: <Box component={Icon} icon={FileIcon} width={18} height={18} borderRadius={1} className="center" />,
      },
      {
        id: 'custom',
        label: 'Custom',
        icon: <Box component={Icon} icon={PencilIcon} width={18} height={18} borderRadius={1} className="center" />,
      },
      getDiscussionStatus() && isAdmin
        ? {
            id: 'discuss',
            label: 'Discuss Kit',
            icon: (
              <Box width={18} height={18} borderRadius={1} className="center">
                <Discuss sx={{ width: '100%', height: '100%' }} />
              </Box>
            ),
          }
        : null,
      {
        id: 'crawl',
        label: 'Crawl from URL',
        icon: <Box component={Icon} icon={DatabaseIcon} width={18} height={18} borderRadius={1} className="center" />,
      },
    ] as SourceTypeSelectType[]
  ).filter(Boolean);

  const [file, setFile] = useState<FileType>();
  const [custom, setCustom] = useState<CustomType>();
  const [discussion, setDiscussion] = useState<CreateDiscussionItem[]>([]);
  const [crawl, setCrawl] = useState<CrawlType>({ provider: 'jina' });

  const handleSubmit = async () => {
    try {
      const params = {
        sourceType,
        ...(sourceType === 'file' && { file }),
        ...(sourceType === 'custom' && { custom }),
        ...(sourceType === 'crawl' && { crawl }),
        ...(sourceType === 'discuss' && { discussion }),
      };

      await createKnowledge(knowledgeId, params);
      Toast.success('Created knowledge');
      onSubmit();
    } catch (error) {
      Toast.error('Failed to create knowledge');
    }
  };

  const disabled = useMemo(() => {
    if (sourceType === 'file') {
      return !file;
    }
    if (sourceType === 'custom') {
      return !custom?.title || !custom?.content;
    }
    if (sourceType === 'crawl') {
      return !crawl.url || !crawl.apiKey;
    }
    if (sourceType === 'discuss') {
      return discussion.length === 0;
    }
    return false;
  }, [sourceType, file, custom, crawl, discussion]);

  return (
    <UploaderProvider
      plugins={[]}
      apiPathProps={{
        uploader: withQuery(joinURL(AIGNE_RUNTIME_MOUNT_POINT, '/api/datasets/upload-document'), { knowledgeId }),
        disableMediaKitPrefix: true,
        disableAutoPrefix: true,
      }}
      restrictions={{
        maxFileSize: (Number(window.blocklet?.preferences?.uploadFileLimit) || 10) * 1024 * 1024,
        allowedFileTypes: [
          '.md', // 允许 Markdown 文件
          '.pdf', // 允许 PDF 文件
          '.doc', // 允许 Word 文档
          '.docx', // 允许新版 Word 文档
          '.txt', // 允许文本文件
          '.json', // 允许 JSON 文件
          'text/plain', // 文本文件 MIME 类型
        ],
      }}
      dashboardProps={{
        fileManagerSelectionType: 'files',
      }}>
      <Dialog
        open
        fullWidth
        maxWidth="xl"
        PaperProps={{ sx: { height: '100%' } }}
        fullScreen={useMediaQuery<Theme>((theme) => theme.breakpoints.down('sm'))}>
        <DialogTitle>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 500 }}>
              Import Knowledge
            </Typography>

            <IconButton size="small" onClick={onClose}>
              <Box component={Icon} icon={XIcon} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stack gap={2.5} height={1}>
            <Stack>
              <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 500, mb: 0.5 }}>
                Select Data Source
              </Typography>
              <Typography variant="body2" color="text.secondary">
                After adding sources, the AI can provide answers based on the information that matters most to you.
              </Typography>
            </Stack>

            <SourceTypeSelect value={sourceType} onChange={setSourceType} options={sourceOptions} />

            <Box flexGrow={1}>
              <Suspense>
                {sourceType === 'file' ? (
                  <FileView fileName={file?.runtime?.originFileName} onChange={setFile} />
                ) : sourceType === 'custom' ? (
                  <CustomView
                    title={custom?.title}
                    content={custom?.content}
                    onTitleChange={(value) => setCustom((prev) => ({ ...(prev || {}), title: value }))}
                    onContentChange={(value) => setCustom((prev) => ({ ...(prev || {}), content: value }))}
                  />
                ) : sourceType === 'crawl' ? (
                  <CrawlView
                    provider={crawl.provider}
                    apiKey={crawl.apiKey}
                    url={crawl.url}
                    onProviderChange={(value) => setCrawl((prev) => ({ ...(prev || {}), provider: value }))}
                    onApiKeyChange={(value) => setCrawl((prev) => ({ ...(prev || {}), apiKey: value }))}
                    onUrlChange={(value) => setCrawl((prev) => ({ ...(prev || {}), url: value }))}
                  />
                ) : sourceType === 'discuss' ? (
                  <DiscussView onChange={setDiscussion} />
                ) : null}
              </Suspense>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button variant="outlined" onClick={onClose}>
            {t('cancel')}
          </Button>
          <LoadingButton variant="contained" onClick={handleSubmit} disabled={disabled}>
            Create
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </UploaderProvider>
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
          variant={value === option.id ? 'contained' : 'outlined'}
          onClick={() => onChange(option.id)}
          disabled={option.disabled}
          startIcon={option.icon ?? null}>
          {option.label}
        </Button>
      ))}
    </Box>
  );
};

const FileView = ({ fileName, onChange }: { fileName?: string; onChange: (value: FileType) => void }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const uploaderRef = useUploader();

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOver(true);
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDraggingOver(false);

    const uploader = uploaderRef?.current?.getUploader();
    uploader?.open();
    uploader.onceUploadSuccess(async ({ response }: any) => {
      onChange(response?.data);
    });
  };

  return (
    <Stack>
      <Box
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
        }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragLeave={() => setIsDraggingOver(false)}>
        <Box display="flex" alignItems="center" gap={1} color="#4B5563">
          <Box component={Icon} icon={ArrowBarToUpIcon} />
          <Typography sx={{ fontWeight: 500 }}>Import Files</Typography>
        </Box>

        <Typography variant="subtitle5" sx={{ fontSize: 13 }}>
          Drag and drop files here or click to upload
        </Typography>
      </Box>

      <Box>{fileName}</Box>
    </Stack>
  );
};

const CustomView = ({ title, content, onTitleChange, onContentChange }: CustomInputProps) => {
  return (
    <Stack gap={2.5}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box
          component="label"
          sx={{
            color: '#111827',
            fontSize: '14px',
            fontWeight: 500,
          }}>
          Title
        </Box>
        <StyledTextField
          fullWidth
          rows={1}
          multiline
          placeholder="Enter title"
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
          Content
        </Box>
        <StyledTextField
          fullWidth
          multiline
          rows={12}
          placeholder="Enter content"
          value={content}
          onChange={(e) => onContentChange?.(e.target.value)}
          variant="outlined"
        />
      </Box>
    </Stack>
  );
};

const CrawlView = ({ provider, onProviderChange, apiKey, onApiKeyChange, url, onUrlChange }: CrawlSettingsProps) => {
  const providers = [
    { id: 'jina', label: 'Jina Reader' },
    { id: 'firecrawl', label: 'Firecrawl' },
  ];

  return (
    <Stack gap={2}>
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
          Provider
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {providers.map((item) => (
            <Button
              key={item.id}
              variant={provider === item.id ? 'contained' : 'outlined'}
              onClick={() => onProviderChange(item.id as 'jina' | 'firecrawl')}
              sx={{
                textTransform: 'none',
                bgcolor: provider === item.id ? 'black' : 'transparent',
                color: provider === item.id ? 'white' : 'inherit',
                '&:hover': {
                  bgcolor: provider === item.id ? 'black' : 'transparent',
                },
                borderColor: '#E5E7EB',
              }}>
              {item.label}
            </Button>
          ))}
        </Box>
      </Box>

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
          API Key
        </Typography>

        <StyledTextField
          fullWidth
          multiline
          rows={1}
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          placeholder="Enter your API key"
          variant="outlined"
        />
      </Box>

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
          URL
        </Typography>

        <StyledTextField
          fullWidth
          multiline
          rows={1}
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="Enter URL to crawl"
          variant="outlined"
        />
      </Box>
    </Stack>
  );
};

const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
    padding: '9px 6px !important',
    gap: '6px',
    width: '100%',

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
});
