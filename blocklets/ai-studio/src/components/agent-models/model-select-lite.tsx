import { ModelDrivenAssistantYjs, TextModelInfo } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import CheckIcon from '@iconify-icons/tabler/check';
import PlusIcon from '@iconify-icons/tabler/plus';
import { Box, Button, ClickAwayListener, Grow, Paper, Popper, Stack } from '@mui/material';
import { bindDialog, bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';

import { ModelBrandIcon } from './model-brand-icon';
import { ModelSelectDialog } from './model-select';
import { AgentModel, ModelType } from './types';
import { useAgentDefaultModel, useSuggestedModels } from './use-models';

interface InternalModelSelectLiteProps {
  options: AgentModel[];
  value?: string | null;
  onChange: (value: string) => void;
  onAddMoreModel?: () => void;
}

function InternalModelSelectLite({ options, value, onChange, onAddMoreModel, ...rest }: InternalModelSelectLiteProps) {
  const popperState = usePopupState({ variant: 'popper', popupId: 'model-select-lite' });
  const selectedOption = options.find((option) => option.model === value);
  return (
    <Box {...rest}>
      <Button color="inherit" {...bindTrigger(popperState)}>
        {selectedOption?.model && <ModelBrandIcon model={selectedOption.model} size="small" sx={{ mr: 0.5 }} />}
        <span>{selectedOption?.name || 'Select a model'}</span>
      </Button>

      <Popper {...bindPopper(popperState)} sx={{ zIndex: 1101 }} transition placement="bottom-end">
        {({ TransitionProps }) => (
          <Grow style={{ transformOrigin: 'right top' }} {...TransitionProps}>
            <Paper
              sx={{
                border: '1px solid #ddd',
                height: '100%',
                overflow: 'auto',
                mt: 1,
              }}>
              <ClickAwayListener
                onClickAway={(e) => (e.target as HTMLElement)?.localName !== 'body' && popperState.close()}>
                <Stack>
                  <Box sx={{ maxHeight: 240, p: 1, overflowY: 'auto' }}>
                    {options.map((option) => {
                      const isSelected = option.model === value;
                      return (
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          spacing={1}
                          key={option.model}
                          onClick={() => {
                            onChange(option.model);
                            popperState.close();
                          }}
                          sx={{
                            width: '100%',
                            height: 48,
                            px: 1,
                            cursor: 'pointer',
                            borderRadius: 0.5,
                            ...(isSelected && { bgcolor: 'action.selected' }),
                            ...(!isSelected && { '&:hover': { bgcolor: '#f0f0f0' } }),
                          }}>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: '0 0 auto' }}>
                            <ModelBrandIcon model={option.model} />
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
                          <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="flex-end"
                            sx={{ flex: '0 0 auto', width: 64, pr: 1 }}>
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
                        Add more model
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
  agent: ModelDrivenAssistantYjs;
}

export function ModelSelectLite({ type, projectId, gitRef, agent, ...rest }: ModelSelectLiteProps) {
  const defaultModel = useAgentDefaultModel({ projectId, gitRef, value: agent });
  const suggestedModels = useSuggestedModels({ type, pinnedModels: defaultModel ? [defaultModel] : [] });
  const dialogState = usePopupState({ variant: 'dialog', popupId: 'model-select' });

  const handleOnChange = (value: string) => {
    agent.model = value;
  };

  const options = suggestedModels.map((model) => ({
    ...model,
    name: model.name || model.model,
    maxTokens: (model as TextModelInfo).maxTokensDefault, // TODO: @wq
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
