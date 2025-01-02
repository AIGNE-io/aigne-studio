import { Icon } from '@iconify-icon/react';
import CubeIcon from '@iconify-icons/tabler/cube';
import type { SxProps } from '@mui/material';
import { Box } from '@mui/material';

import AzureIcon from '../selector/ai-icons/azure';
import GoogleIcon from '../selector/ai-icons/google';
import HuggingFaceIcon from '../selector/ai-icons/hugging-face';
import MistralIcon from '../selector/ai-icons/mistral.png?url';
import OpenAIIcon from '../selector/ai-icons/openai';
import ReplicateIcon from '../selector/ai-icons/replicate';
import VertexAIIcon from '../selector/ai-icons/vertex-ai';
import { useModelBrand } from './use-models';

export const brandIcon = (brand: string) =>
  ({
    OpenAI: <OpenAIIcon sx={{ fontSize: '1em' }} />,
    'Azure OpenAI': <AzureIcon sx={{ fontSize: '1em' }} />,
    'Hugging Face': <HuggingFaceIcon sx={{ fontSize: '1em' }} />,
    Replicate: <ReplicateIcon sx={{ fontSize: '1em' }} />,
    'Vertex AI': <VertexAIIcon sx={{ fontSize: '1em' }} />,
    Google: <GoogleIcon sx={{ fontSize: '1em' }} />,
    'Mistral AI': <Box component="img" src={MistralIcon} width="1em" height="1em" alt="Mistral AI" />,
  })[brand];

interface ModelIconProps {
  model: string;
  url?: string;
  size?: 'small' | 'medium' | 'large';
  sx?: SxProps;
}

const sizeMap = {
  small: 20,
  medium: 32,
  large: 48,
};

export function ModelBrandIcon({ model, size = 'medium', sx, url }: ModelIconProps) {
  const brand = useModelBrand(model);
  const computedSize = sizeMap[size];
  const mergedSx = [
    {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: computedSize,
      height: computedSize,
      fontSize: computedSize,
      borderRadius: '25%',
    },
    ...(Array.isArray(sx) ? sx : [sx]),
  ];
  const renderIcon = () => {
    if (url) {
      return <Box component="img" src={url} width="0.85em" height="0.85em" alt={model} sx={{ objectFit: 'cover' }} />;
    }
    return brand ? (
      brandIcon(brand)
    ) : (
      <Box component={Icon} icon={CubeIcon} sx={{ fontSize: computedSize, color: 'grey.400' }} />
    );
  };
  return <Box sx={mergedSx}>{renderIcon()}</Box>;
}
