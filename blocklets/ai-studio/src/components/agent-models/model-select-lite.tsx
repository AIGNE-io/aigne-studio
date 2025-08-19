import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ImageModelInfo, ModelBasedAssistantYjs, TextModelInfo } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import CheckIcon from '@iconify-icons/tabler/check';
import PlusIcon from '@iconify-icons/tabler/plus';
import { Box, Button, ClickAwayListener, Grow, Paper, Popper, Stack } from '@mui/material';
import { bindDialog, bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import millify from 'millify';

import { ModelBrandIcon } from './model-brand-icon';
import { ModelSelectDialog } from './model-select';
import { ModelType } from './types';
import { useAgentDefaultModel, useSuggestedModels } from './use-models';

interface InternalModelSelectLiteProps {
  options: TextModelInfo[] | ImageModelInfo[];
  value?: string | null;
  onChange: (value: string) => void;
  onAddMoreModel?: () => void;
}

function InternalModelSelectLite({
  options,
  value = undefined,
  onChange,
  onAddMoreModel = undefined,
  ...rest
}: InternalModelSelectLiteProps) {
  const { t } = useLocaleContext();
  const popperState = usePopupState({ variant: 'popper', popupId: 'model-select-lite' });
  const selectedOption = options.find((option) => option.model === value);

  return (
    <Box {...rest}>
      <Button color="inherit" {...bindTrigger(popperState)} data-testid="model-select-lite-trigger">
        {selectedOption?.model && (
          <ModelBrandIcon model={selectedOption.model} url={selectedOption.icon} size="small" sx={{ mr: 0.5 }} />
        )}
        <span>{selectedOption?.name || 'Select a model'}</span>
      </Button>
      <Popper {...bindPopper(popperState)} sx={{ zIndex: 1101 }} transition placement="bottom-end">
        {({ TransitionProps }) => (
          <Grow style={{ transformOrigin: 'right top' }} {...TransitionProps}>
            <Paper
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                height: '100%',
                overflow: 'auto',
                mt: 1,
              }}>
              <ClickAwayListener
                onClickAway={(e) => (e.target as HTMLElement)?.localName !== 'body' && popperState.close()}>
                <Stack>
                  <Box sx={{ maxHeight: 240, p: 1, overflowY: 'auto' }} data-testid="model-select-lite-options">
                    {options.map((option) => {
                      const isSelected = option.model === value;
                      return (
                        <Stack
                          data-testid={option.model}
                          direction="row"
                          spacing={1}
                          key={option.model}
                          onClick={() => {
                            onChange(option.model);
                            popperState.close();
                          }}
                          sx={{
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            height: 48,
                            px: 1,
                            cursor: 'pointer',
                            borderRadius: 0.5,
                            ...(isSelected && { bgcolor: 'action.selected' }),
                            ...(!isSelected && { '&:hover': { bgcolor: 'grey.100' } }),
                          }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{
                              alignItems: 'center',
                              flex: '0 0 auto',
                            }}>
                            <ModelBrandIcon model={option.model} url={option.icon} />
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
                          <Stack
                            direction="row"
                            sx={{
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              flex: '0 0 auto',
                              width: 64,
                              pr: 1,
                            }}>
                            <Box
                              component={Icon}
                              icon={CheckIcon}
                              sx={{
                                color: 'primary.main',
                                fontSize: 20,
                                visibility: isSelected ? 'visible' : 'hidden',
                              }}
                            />
                          </Stack>
                        </Stack>
                      );
                    })}
                  </Box>
                  {onAddMoreModel && (
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        height: 48,
                        px: 1,
                        mt: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}>
                      <Button startIcon={<Icon icon={PlusIcon} />} onClick={onAddMoreModel} sx={{ width: '100%' }}>
                        {t('moreModels')}
                      </Button>
                    </Box>
                  )}
                </Stack>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </Box>
  );
}

interface ModelSelectLiteProps {
  type: ModelType;
  projectId: string;
  gitRef: string;
  agent: ModelBasedAssistantYjs;
}

export function ModelSelectLite({ type, projectId, gitRef, agent, ...rest }: ModelSelectLiteProps) {
  const defaultModel = useAgentDefaultModel({ projectId, gitRef, value: agent });
  const suggestedModels = useSuggestedModels({ type, requiredModel: agent.model || defaultModel });
  const dialogState = usePopupState({ variant: 'dialog', popupId: 'model-select' });

  const handleOnChange = (value: string) => {
    agent.model = value;
  };

  const options = suggestedModels.map((model) => ({
    ...model,
    name: model.name || model.model,
  }));

  return (
    <Box {...rest}>
      <InternalModelSelectLite
        options={options}
        value={agent.model || defaultModel}
        onChange={handleOnChange}
        onAddMoreModel={() => dialogState.open()}
      />
      <ModelSelectDialog type={type} agent={agent} dialogProps={{ ...bindDialog(dialogState) }} />
    </Box>
  );
}
