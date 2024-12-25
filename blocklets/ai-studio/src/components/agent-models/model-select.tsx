import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ImageModelInfo, ModelBasedAssistantYjs, TextModelInfo } from '@blocklet/ai-runtime/types';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/aigne-sdk/constants';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { AddComponent } from '@blocklet/ui-react';
import { Icon } from '@iconify-icon/react';
import StarIcon from '@iconify-icons/tabler/star';
import StarFilledIcon from '@iconify-icons/tabler/star-filled';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogProps,
  DialogTitle,
  Stack,
  Theme,
  useMediaQuery,
} from '@mui/material';
import millify from 'millify';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useCurrentProject } from '../../contexts/project';
import { useIsAdmin } from '../../contexts/session';
import { useProjectStore } from '../../pages/project/yjs-state';
import { ModelBrandIcon } from './model-brand-icon';
import { Tag, TagFilter } from './tag';
import { ModelType } from './types';
import { useAllModels } from './use-models';
import { sortModels } from './utils';

interface Props {
  options: TextModelInfo[] | ImageModelInfo[];
  value?: string | null;
  onChange: (value: string | null) => void;
  onStar: (model: string) => void;
  starredModels?: Set<string>;
}

export function ModelSelect({ options, value, onChange, onStar, starredModels, ...rest }: Props) {
  return (
    <Box {...rest}>
      <Box>
        {options.map((option) => {
          const isSelected = option.model === value;
          const isStarred = starredModels?.has(option.model);
          return (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
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
              <Stack direction="row" alignItems="center" spacing={1}>
                <ModelBrandIcon model={option.model} url={option.icon} size="large" />
                <Box>{option.name}</Box>
                {'maxTokensMax' in option && option.maxTokensMax && (
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
                    {millify(option.maxTokensMax, { precision: 0 })}
                  </Box>
                )}
              </Stack>

              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  onStar(option.model);
                }}
                sx={{ pr: 1 }}>
                {isStarred ? (
                  <Box component={Icon} icon={StarFilledIcon} sx={{ color: 'warning.main' }} />
                ) : (
                  <Box component={Icon} icon={StarIcon} />
                )}
              </Box>
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
  agent: ModelBasedAssistantYjs;
}

const RECENT_MODELS_MAX_COUNT = 10;

export function ModelSelectDialog({ type, dialogProps, agent }: ModelSelectDialogProps) {
  const { t } = useLocaleContext();
  const [tags, setTags] = useState<string[]>([]);
  const models = useAllModels(type);
  const allTags = Array.from(new Set(models.map((x) => x.tags || []).flat()));
  const [selected, setSelected] = useState<string | null>(null);
  const isAdmin = useIsAdmin();
  const addComponentRef = useRef<{ onClick?: () => void; loading?: boolean }>();
  const [showStarred, setShowStarred] = useState(false);
  const { projectId, projectRef } = useCurrentProject();
  const { projectSetting } = useProjectStore(projectId, projectRef);
  const downSm = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  const handleToggleStar = (model: string) => {
    const doc = (getYjsValue(projectSetting) as Map<any>).doc!;
    doc.transact(() => {
      projectSetting.starredModels ??= [];
      if (projectSetting.starredModels.includes(model)) {
        projectSetting.starredModels = projectSetting.starredModels.filter((x) => x !== model);
      } else {
        projectSetting.starredModels.push(model);
      }
    });
  };

  const handleUseModel = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!selected) return;
    if (!projectSetting.recentModels?.includes(selected)) {
      const doc = (getYjsValue(projectSetting) as Map<any>).doc!;
      doc.transact(() => {
        const recentModels = (projectSetting.recentModels ?? []).slice();
        recentModels.push(selected);
        if (recentModels.length > RECENT_MODELS_MAX_COUNT) {
          recentModels.shift();
        }
        projectSetting.recentModels = recentModels;
      });
    }
    agent.model = selected || undefined;
    dialogProps.onClose?.(e, 'backdropClick');
  };

  const starredModelSet = useMemo(() => new Set(projectSetting.starredModels ?? []), [projectSetting]);

  const options = models.map((model) => ({
    ...model,
    name: model.name || model.model,
  }));
  const filteredOptions = options.filter((x) => {
    if (!showStarred && !tags.length) {
      return true;
    }
    if (showStarred && starredModelSet.has(x.model)) {
      return true;
    }
    return x.tags?.some((tag) => tags.includes(tag));
  });

  // 避免收藏后立即改变模型列表顺序 (窗口 close 后更新排序)
  const initialStarredModelsRef = useRef([...(projectSetting.starredModels ?? [])]);
  useEffect(() => {
    if (!dialogProps.open) {
      initialStarredModelsRef.current = [...(projectSetting.starredModels ?? [])];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogProps.open]);
  const sortedOptions = sortModels(initialStarredModelsRef.current, projectSetting.recentModels ?? [], filteredOptions);

  return (
    <Dialog maxWidth="md" fullWidth fullScreen={downSm} {...dialogProps}>
      <DialogTitle>Models</DialogTitle>

      <DialogContent sx={{ height: { md: '50vh' }, maxHeight: { xs: 'none', sm: 500 } }}>
        <Box sx={{ my: 1.5, mb: 2.5 }}>
          <TagFilter
            tags={allTags}
            value={tags}
            onChange={setTags}
            prepend={
              <>
                <Tag
                  label={t('all')}
                  selected={!tags.length && !showStarred}
                  onClick={() => {
                    setTags([]);
                    setShowStarred(false);
                  }}
                />
                <Tag
                  label={
                    <span>
                      <Box component="span" sx={{ display: 'inline-block', mr: 0.5, fontSize: '0.875em' }}>
                        ⭐
                      </Box>
                      {t('favorites')}
                    </span>
                  }
                  selected={showStarred}
                  onClick={() => setShowStarred(!showStarred)}
                />
              </>
            }
          />
        </Box>
        <ModelSelect
          options={sortedOptions}
          value={selected}
          onChange={setSelected}
          onStar={handleToggleStar}
          starredModels={starredModelSet}
        />
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          disabled={!isAdmin}
          onMouseDown={() => {
            addComponentRef.current?.onClick?.();
          }}>
          {t('addMoreAgentTools')}
        </Button>

        <Stack direction="row" spacing={2}>
          <Button variant="outlined" onClick={(e) => dialogProps.onClose?.(e, 'backdropClick')}>
            {t('close')}
          </Button>
          <Button variant="contained" disabled={!selected} onClick={handleUseModel}>
            Use this Model
          </Button>
        </Stack>
      </DialogActions>

      <AddComponent
        componentDid={window.blocklet.appId}
        resourceDid={AIGNE_STUDIO_COMPONENT_DID}
        resourceType={`${type}-adapter`}
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
