import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { getSupportedImagesModels, getSupportedModels } from '@blocklet/ai-runtime/common';
import { ImageModelInfo, TextModelInfo } from '@blocklet/ai-runtime/types';
import { Box, ListItemText, MenuItem, TextField, TextFieldProps, menuItemClasses } from '@mui/material';
import { useAsync } from 'react-use';

import AzureIcon from './ai-icons/azure';
import GoogleIcon from './ai-icons/google';
import HuggingFaceIcon from './ai-icons/hugging-face';
import MistralIcon from './ai-icons/mistral.png?url';
import OpenAIIcon from './ai-icons/openai';
import ReplicateIcon from './ai-icons/replicate';
import VertexAIIcon from './ai-icons/vertex-ai';

export default function ModelSelectField({ isImageModel, ...props }: { isImageModel?: boolean } & TextFieldProps) {
  const { t } = useLocaleContext();

  const { value, loading, error } = useAsync<() => Promise<(TextModelInfo | ImageModelInfo)[]>>(() => {
    return isImageModel ? getSupportedImagesModels() : getSupportedModels();
  }, [isImageModel]);

  if (error) throw error;

  if (loading) return null;

  return (
    <TextField
      {...props}
      select
      SelectProps={{
        ...props.SelectProps,
        renderValue: (m) => {
          const model = value?.find((i) => i.model === m);
          if (!model) return null;

          return (
            <Box mt={-0.5} display="flex" alignItems="center" gap={0.5}>
              <Box width={16} height={16}>
                {brandIcon(model.brand)}
              </Box>
              <ListItemText
                sx={{ display: 'inline-flex', alignItems: 'baseline' }}
                primary={model.name || model.model}
              />
            </Box>
          );
        },
      }}
      sx={{ border: '1px solid #E5E7EB', borderRadius: 1 }}>
      {value?.map((model) => {
        const icon = brandIcon(model!.brand);

        return (
          <MenuItem
            key={model.model}
            value={model.model}
            disabled={model.disabled}
            sx={{ [`&.${menuItemClasses.disabled}`]: { opacity: 1 } }}>
            <Box display="flex" gap={1} alignItems="center">
              <Box className="center" width={16} height={16}>
                {icon}
              </Box>
              <ListItemText
                sx={{ display: 'inline-flex', alignItems: 'baseline' }}
                primary={model.name || model.model}
                secondary={model.disabled ? '(coming soon)' : undefined}
                secondaryTypographyProps={{ fontStyle: 'italic', ml: 1 }}
              />
            </Box>
          </MenuItem>
        );
      })}
      {loading ? (
        <MenuItem disabled value="loading">
          {t('loading')}
        </MenuItem>
      ) : (
        !value?.length && (
          <MenuItem disabled value="empty">
            {t('noData')}
          </MenuItem>
        )
      )}
    </TextField>
  );
}

export const brandIcon = (brand: string) =>
  ({
    OpenAI: <OpenAIIcon fontSize="small" sx={{ width: '100%', height: '100%' }} />,
    'Azure OpenAI': <AzureIcon fontSize="small" sx={{ width: '100%', height: '100%' }} />,
    'Hugging Face': <HuggingFaceIcon fontSize="small" sx={{ width: '100%', height: '100%' }} />,
    Replicate: <ReplicateIcon fontSize="small" sx={{ width: '100%', height: '100%' }} />,
    'Vertex AI': <VertexAIIcon fontSize="small" sx={{ width: '100%', height: '100%' }} />,
    Google: <GoogleIcon fontSize="small" sx={{ width: '100%', height: '100%' }} />,
    'Mistral AI': <Box component="img" src={MistralIcon} width={15} height={15} />,
  })[brand];
