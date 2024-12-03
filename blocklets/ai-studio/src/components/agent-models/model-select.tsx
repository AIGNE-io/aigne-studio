import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { TextModelInfo } from '@blocklet/ai-runtime/types';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/aigne-sdk/constants';
import { AddComponent } from '@blocklet/ui-react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogProps, DialogTitle, Stack } from '@mui/material';
import { useRef, useState } from 'react';

import { useIsAdmin } from '../../contexts/session';
import { ModelBrandIcon } from './model-brand-icon';
import { Tag, TagFilter } from './tag';
import { AgentModel, ModelType } from './types';
import { useAllModels } from './use-models';

interface Props {
  options: AgentModel[];
  value?: string | null;
  onChange: (value: string | null) => void;
  onStar: (model: string) => void;
}

export function ModelSelect({ options, value, onChange, onStar, ...rest }: Props) {
  return (
    <Box {...rest}>
      <Box>
        {options.map((option) => {
          const isSelected = option.model === value;
          return (
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              key={option.model}
              onClick={() => {
                onChange(option.model === value ? null : option.model);
              }}
              sx={{
                width: '100%',
                height: 72,
                mt: 2,
                px: 1,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
                cursor: 'pointer',
                ...(isSelected && { bgcolor: 'action.selected', borderColor: 'primary.main' }),
                ...(!isSelected && { '&:hover': { bgcolor: '#f0f0f0' } }),
              }}>
              <ModelBrandIcon model={option.model} size="large" />
              <Box>{option.name}</Box>
              {option.maxTokens && (
                <Box
                  sx={{
                    p: '1px 4px',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 0.5,
                    bgcolor: 'grey.100',
                    color: 'grey.800',
                    fontSize: 12,
                  }}>
                  {option.maxTokens}
                </Box>
              )}
            </Stack>
          );
        })}
      </Box>
    </Box>
  );
}

interface ModelSelectDialogProps {
  type: ModelType;
  dialogProps: DialogProps;
}

export function ModelSelectDialog({ type, dialogProps }: ModelSelectDialogProps) {
  const { t } = useLocaleContext();
  const models = useAllModels(type);
  const [selected, setSelected] = useState<string | null>(null);
  console.log('🚀 ~ ModelSelectDialog ~ models:', models);
  const isAdmin = useIsAdmin();
  const addComponentRef = useRef<{ onClick?: () => void; loading?: boolean }>();
  const [tags, setTags] = useState<string[]>([]);
  const [isFavorites, setIsFavorites] = useState(false);

  const options = models.map((model) => ({
    ...model,
    name: model.name || model.model,
    maxTokens: (model as TextModelInfo).maxTokensDefault, // TODO: @wq
  }));

  const handleStar = (model: string) => {
    console.log('🚀 ~ handleStar ~ model:', model);
  };

  return (
    <Dialog maxWidth="md" fullWidth {...dialogProps} open>
      <DialogTitle>Models</DialogTitle>

      <DialogContent sx={{ maxHeight: { xs: 'none', md: '50vh' } }}>
        <Box sx={{ my: 1.5, mb: 2.5 }}>
          <TagFilter
            value={tags}
            onChange={setTags}
            prepend={
              <Tag
                label={
                  <span>
                    <Box component="span" sx={{ display: 'inline-block', mr: 0.5, fontSize: '0.875em' }}>
                      ⭐
                    </Box>
                    Favorites
                  </span>
                }
                selected={isFavorites}
                onClick={() => setIsFavorites(!isFavorites)}
              />
            }
          />
        </Box>
        <ModelSelect options={options} value={selected} onChange={setSelected} onStar={handleStar} />
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Button variant="outlined" disabled={!isAdmin} onMouseDown={addComponentRef.current?.onClick}>
          {t('addMoreAgentTools')}
        </Button>

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={(e) => dialogProps.onClose?.(e, 'backdropClick')}>
            {t('close')}
          </Button>
          <Button variant="contained" disabled={!selected}>
            Use this Model
          </Button>
        </Stack>
      </DialogActions>

      <AddComponent
        componentDid={window.blocklet.appId}
        resourceDid={AIGNE_STUDIO_COMPONENT_DID}
        resourceType={type}
        autoClose={false}
        render={({ onClick, loading }) => {
          addComponentRef.current = { onClick, loading };
          return <Box />;
        }}
        onClose={() => {}}
        onComplete={() => {}}
      />
    </Dialog>
  );
}
