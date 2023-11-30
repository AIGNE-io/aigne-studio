import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  Box,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  MenuItem,
  TextField,
  TextFieldProps,
  menuItemClasses,
} from '@mui/material';
import { groupBy } from 'lodash';
import { useEffect, useMemo } from 'react';
import { useAsync } from 'react-use';

import { getSupportedImagesModels, getSupportedModels } from '../../libs/common';
import AzureIcon from './ai-icons/azure';
import HuggingFaceIcon from './ai-icons/hugging-face';
import OpenAIIcon from './ai-icons/openai';
import ReplicateIcon from './ai-icons/replicate';
import VertexAIIcon from './ai-icons/vertex-ai';

export default function ModelSelectField({ isImageModel, ...props }: { isImageModel?: boolean } & TextFieldProps) {
  const { t } = useLocaleContext();

  const { value, loading, error } = useAsync(() => {
    return isImageModel ? getSupportedImagesModels() : getSupportedModels();
  }, [isImageModel]);

  if (error) throw error;

  useEffect(() => {
    const first = value?.[0]?.model;
    if (!props.value && first) {
      props.onChange?.({ target: { value: first } } as any);
    }
  }, [value, props.value]);

  const groups = useMemo(() => {
    return Object.values(groupBy(value, 'brand'));
  }, [value]);

  return (
    <TextField
      {...props}
      select
      SelectProps={{
        renderValue: (m) => {
          const model = value?.find((i) => i.model === m);
          if (!model) return null;

          return (
            <Box mt={-0.5}>
              <ListItemIcon sx={{ verticalAlign: 'middle', minWidth: 32 }}>{brandIcon(model.brand)}</ListItemIcon>

              <ListItemText sx={{ display: 'inline-flex', alignItems: 'baseline' }} primary={model.model} />
            </Box>
          );
        },
      }}>
      {groups?.flatMap((models) => {
        const icon = brandIcon(models[0]!.brand);

        const options = models.map((model) => {
          return (
            <MenuItem
              key={model.model}
              value={model.model}
              disabled={model.disabled}
              sx={{ [`&.${menuItemClasses.disabled}`]: { opacity: 1 } }}>
              <ListItemIcon sx={{ verticalAlign: 'middle', minWidth: 32 }}>{models.length === 1 && icon}</ListItemIcon>

              <ListItemText
                sx={{ display: 'inline-flex', alignItems: 'baseline' }}
                primary={model.model}
                secondary={model.disabled ? '(coming soon)' : undefined}
                secondaryTypographyProps={{ fontStyle: 'italic', ml: 1 }}
              />
            </MenuItem>
          );
        });

        if (models.length > 1) {
          options.unshift(
            <ListSubheader key={`brand-${models[0]?.brand}`} sx={{ display: 'flex', alignItems: 'center' }}>
              <ListItemIcon sx={{ verticalAlign: 'middle', minWidth: 32 }}>{icon}</ListItemIcon>
              <ListItemText primary={models[0]!.brand} />
            </ListSubheader>
          );
        }

        return options;
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

const brandIcon = (brand: string) =>
  ({
    OpenAI: <OpenAIIcon fontSize="small" />,
    'Azure OpenAI': <AzureIcon fontSize="small" />,
    'Hugging Face': <HuggingFaceIcon fontSize="small" />,
    Replicate: <ReplicateIcon fontSize="small" />,
    'Vertex AI': <VertexAIIcon fontSize="small" />,
  }[brand]);
