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
import { Suspense, useState } from 'react';

import DiscussView from '../discuss';
import { CreateKnowledgeParams, SourceType, SourceTypeSelectType } from './type';

export default function ImportKnowledge({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [sourceType, setSourceType] = useState<SourceType>('file');

  const sourceOptions = [
    { id: 'file', label: 'Import from file', icon: FileIcon },
    { id: 'custom', label: 'Custom', icon: PencilIcon },
    { id: 'discuss', label: 'Discuss Kit', icon: DatabaseIcon },
    { id: 'crawl', label: 'Crawl from URL', icon: DatabaseIcon },
  ] as SourceTypeSelectType[];

  const [files, setFiles] = useState<File[]>([]);
  const [content, setContent] = useState('');
  const [provider, setProvider] = useState<'jina' | 'firecrawl'>('jina');
  const [apiKey, setApiKey] = useState('');
  const [url, setUrl] = useState('');

  const createKnowledge = async (params: CreateKnowledgeParams) => {
    return Promise.resolve(params);
  };

  const handleSubmit = async () => {
    try {
      const params = {
        title: 'New Knowledge',
        sourceType,
        ...(sourceType === 'file' && { files }),
        ...(sourceType === 'custom' && { content }),
        ...(sourceType === 'crawl' && { provider, apiKey, url }),
      };

      await createKnowledge(params);
      Toast.success('Created knowledge');
      onSubmit();
    } catch (error) {
      Toast.error('Failed to create knowledge');
    }
  };

  return (
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
        <Stack gap={2.5}>
          <Stack>
            <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 500, mb: 0.5 }}>
              Select Data Source
            </Typography>
            <Typography variant="body2" color="text.secondary">
              After adding sources, the AI can provide answers based on the information that matters most to you.
            </Typography>
          </Stack>

          <SourceTypeSelect value={sourceType} onChange={setSourceType} options={sourceOptions} />

          <Suspense>
            {sourceType === 'file' ? (
              <FileView />
            ) : sourceType === 'custom' ? (
              <CustomView />
            ) : sourceType === 'crawl' ? (
              <CrawlView />
            ) : sourceType === 'discuss' ? (
              <DiscussView />
            ) : null}
          </Suspense>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit}>
          Create
        </Button>
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
          variant={value === option.id ? 'contained' : 'outlined'}
          onClick={() => onChange(option.id)}
          disabled={option.disabled}
          startIcon={option.icon ? <Box component={Icon} icon={option.icon} /> : null}>
          {option.label}
        </Button>
      ))}
    </Box>
  );
};

const FileView = () => {
  return (
    <Box
      sx={{
        bgcolor: '#F9FAFB',
        border: '1px dashed #EFF1F5',
        borderRadius: 1,
        height: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        cursor: 'pointer',
      }}>
      <Box display="flex" alignItems="center" gap={1} color="#4B5563">
        <Box component={Icon} icon={ArrowBarToUpIcon} />
        <Typography sx={{ fontWeight: 500 }}>Import Files</Typography>
      </Box>

      <Typography variant="subtitle5" sx={{ fontSize: 13 }}>
        Drag and drop files here or click to upload
      </Typography>
    </Box>
  );
};

interface CustomInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const CustomView = ({ value, onChange, placeholder }: CustomInputProps) => {
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
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
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
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          variant="outlined"
        />
      </Box>
    </Stack>
  );
};

interface CrawlSettingsProps {
  provider: string;
  onProviderChange: (provider: string) => void;
  apiKey: string;
  onApiKeyChange: (value: string) => void;
  url: string;
  onUrlChange: (value: string) => void;
}

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
              onClick={() => onProviderChange(item.id)}
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
    padding: '9px 12px !important',
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
