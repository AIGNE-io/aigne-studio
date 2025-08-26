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

import AnthropicIcon from './ai-icons/anthropic';
import AzureIcon from './ai-icons/azure';
import BedrockIcon from './ai-icons/bedrock';
import DeepSeekIcon from './ai-icons/deepseek';
import GeminiIcon from './ai-icons/gemini';
import GoogleIcon from './ai-icons/google';
import HuggingFaceIcon from './ai-icons/hugging-face';
import MistralIcon from './ai-icons/mistral.png?url';
import OllamaIcon from './ai-icons/ollama';
import OpenAIIcon from './ai-icons/openai';
import OpenRouterIcon from './ai-icons/openrouter';
import ReplicateIcon from './ai-icons/replicate';
import VertexAIIcon from './ai-icons/vertex-ai';
import XAIIcon from './ai-icons/xai';

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
      sx={{ [`.${filledInputClasses.root}`]: { border: '1px solid', borderColor: 'divider' } }}>
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

export const brandIcon = (brand: string) => {
  const map = {
    openai: <OpenAIIcon fontSize="small" />,
    azure: <AzureIcon fontSize="small" />,
    'hugging face': <HuggingFaceIcon fontSize="small" />,
    replicate: <ReplicateIcon fontSize="small" />,
    vertex: <VertexAIIcon fontSize="small" />,
    google: <GoogleIcon fontSize="small" />,
    mistral: (
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
    openrouter: <OpenRouterIcon fontSize="small" />,
    ollama: <OllamaIcon fontSize="small" />,
    xai: <XAIIcon fontSize="small" />,
    deepseek: <DeepSeekIcon fontSize="small" />,
    anthropic: <AnthropicIcon fontSize="small" />,
    bedrock: <BedrockIcon fontSize="small" />,
    gemini: <GeminiIcon fontSize="small" />,
  };

  return Object.entries(map).find(([key]) => brand.toLowerCase().includes(key))?.[1];
};
