import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { getSupportedImagesModels, getSupportedModels } from '@blocklet/ai-runtime/common';
import { ImageModelInfo, TextModelInfo } from '@blocklet/ai-runtime/types';
import {
  Box,
  ListItemIcon,
  ListItemText,
  MenuItem,
  TextField,
  TextFieldProps,
  filledInputClasses,
  menuItemClasses,
} from '@mui/material';
import { useAsync } from 'react-use';

import AzureIcon from './ai-icons/azure';
import GoogleIcon from './ai-icons/google';
import HuggingFaceIcon from './ai-icons/hugging-face';
import MistralIcon from './ai-icons/mistral.png?url';
import OpenAIIcon from './ai-icons/openai';
import ReplicateIcon from './ai-icons/replicate';
import VertexAIIcon from './ai-icons/vertex-ai';

export default function ModelSelectField({
  isImageModel = undefined,
  ...props
}: { isImageModel?: boolean } & TextFieldProps) {
  const { t } = useLocaleContext();

  const { value, loading, error } = useAsync<() => Promise<(TextModelInfo | ImageModelInfo)[]>>(() => {
    return isImageModel ? getSupportedImagesModels() : getSupportedModels();
  }, [isImageModel]);

  if (error) throw error;

  if (loading) return null;

  return (
    <TextField
      data-testid="model-select-field"
      {...props}
      select
      sx={{ [`.${filledInputClasses.root}`]: { border: '1px solid #E5E7EB' } }}>
      {value?.map((model) => {
        const icon = brandIcon(model!.brand);

        return (
          <MenuItem
            key={model.model}
            value={model.model}
            disabled={model.disabled}
            sx={{ [`&.${menuItemClasses.disabled}`]: { opacity: 1 } }}>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
              }}>
              <ListItemIcon>{icon}</ListItemIcon>

              <ListItemText
                sx={{ display: 'inline-flex', alignItems: 'baseline' }}
                primary={model.name || model.model}
                secondary={model.disabled ? '(coming soon)' : undefined}
                slotProps={{
                  secondary: { fontStyle: 'italic', ml: 1 },
                }}
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
    OpenAI: <OpenAIIcon fontSize="small" />,
    'Azure OpenAI': <AzureIcon fontSize="small" />,
    'Hugging Face': <HuggingFaceIcon fontSize="small" />,
    Replicate: <ReplicateIcon fontSize="small" />,
    'Vertex AI': <VertexAIIcon fontSize="small" />,
    Google: <GoogleIcon fontSize="small" />,
    'Mistral AI': (
      <Box
        component="img"
        src={MistralIcon}
        alt="Mistral AI"
        sx={{
          width: '1rem',
          height: '1rem',
        }}
      />
    ),
  })[brand];
