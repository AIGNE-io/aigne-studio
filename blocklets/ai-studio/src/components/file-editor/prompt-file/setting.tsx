import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { PromptAssistantYjs } from '@blocklet/ai-runtime/types';
import { ExpandMoreRounded, InfoOutlined } from '@mui/icons-material';
import { Box, Button, Collapse, FormLabel, Stack, Tooltip, Typography } from '@mui/material';
import isNil from 'lodash/isNil';
import { useMemo, useState } from 'react';
import { useAsync } from 'react-use';

import { getSupportedModels } from '../../../libs/common';
import { useAssistantCompare, useProjectState } from '../../../pages/project/state';
import AwarenessIndicator from '../../awareness/awareness-indicator';
import WithAwareness from '../../awareness/with-awareness';
import ModelSelectField from '../../selector/model-select-field';
import SliderNumberField from '../../slider-number-field';

export default function PromptSetting({
  projectId,
  gitRef,
  value,
  readOnly,
  compareValue,
  isRemoteCompare,
  isOpen = false,
}: {
  projectId: string;
  gitRef: string;
  value: PromptAssistantYjs;
  readOnly?: boolean;
  compareValue?: PromptAssistantYjs;
  isRemoteCompare?: boolean;
  isOpen?: boolean;
}) {
  const { t } = useLocaleContext();

  const [open, setOpen] = useState(isOpen);

  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });

  const { state } = useProjectState(projectId, gitRef);
  const { project } = state;
  const { value: supportedModels } = useAsync(() => getSupportedModels(), []);
  const model = useMemo(() => {
    return supportedModels?.find((i) => i.model === (value.model || project?.model));
  }, [value.model, project?.model, supportedModels]);

  return (
    <>
      <Stack direction="row" alignItems="center" gap={2}>
        <Typography variant="subtitle1">{t('callPrompt')}</Typography>

        <Stack direction="row" flex={1} overflow="hidden" alignItems="center" justifyContent="flex-end">
          {!open && (
            <Stack direction="row" alignItems="center" gap={1}>
              <Typography
                component="span"
                sx={{
                  bgcolor: 'rgba(241, 243, 245, 1)',
                  p: 1,
                  borderRadius: 1,
                  lineHeight: 1,
                  backgroundColor: getDiffBackground('model'),
                }}>
                {model?.name || model?.model || project?.model}
              </Typography>
            </Stack>
          )}
        </Stack>

        <Button sx={{ minWidth: 32, minHeight: 32 }} onClick={() => setOpen(!open)}>
          <ExpandMoreRounded
            sx={{
              transform: open ? 'rotateZ(180deg)' : undefined,
              transition: (theme) => theme.transitions.create('all'),
            }}
          />
        </Button>
      </Stack>

      <Collapse in={open}>
        <Stack py={1} gap={1}>
          <Box position="relative">
            <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'model']}>
              <ModelSelectField
                fullWidth
                label={t('model')}
                value={value.model || project?.model || ''}
                onChange={(e) => (value.model = e.target.value)}
                InputProps={{ readOnly, sx: { backgroundColor: getDiffBackground('model') } }}
              />
            </WithAwareness>

            <AwarenessIndicator
              projectId={projectId}
              gitRef={gitRef}
              path={[value.id, 'model']}
              sx={{ position: 'absolute', right: -16, top: 16 }}
            />
          </Box>

          {model && (
            <>
              {!isNil(model.temperatureMin) && (
                <Box position="relative">
                  <Tooltip title={t('temperatureTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('temperature')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>

                  <Box>
                    <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'temperature']}>
                      <SliderNumberField
                        readOnly={readOnly}
                        min={model.temperatureMin}
                        max={model.temperatureMax}
                        step={0.1}
                        sx={{ flex: 1, backgroundColor: getDiffBackground('temperature') }}
                        value={value.temperature ?? project?.temperature ?? model.temperatureDefault}
                        onChange={(_, v) => (value.temperature = v)}
                      />
                    </WithAwareness>

                    <AwarenessIndicator
                      projectId={projectId}
                      gitRef={gitRef}
                      path={[value.id, 'temperature']}
                      sx={{ position: 'absolute', right: -16, top: 16 }}
                    />
                  </Box>
                </Box>
              )}

              {!isNil(model.topPMin) && (
                <Box position="relative">
                  <Tooltip title={t('topPTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('topP')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>

                  <Box>
                    <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'topP']}>
                      <SliderNumberField
                        readOnly={readOnly}
                        min={model.topPMin}
                        max={model.topPMax}
                        step={0.1}
                        value={value.topP ?? project?.topP ?? model.topPDefault}
                        onChange={(_, v) => (value.topP = v)}
                        sx={{ flex: 1, backgroundColor: getDiffBackground('topP') }}
                      />
                    </WithAwareness>

                    <AwarenessIndicator
                      projectId={projectId}
                      gitRef={gitRef}
                      path={[value.id, 'topP']}
                      sx={{ position: 'absolute', right: -16, top: 16 }}
                    />
                  </Box>
                </Box>
              )}

              {!isNil(model.presencePenaltyMin) && (
                <Box position="relative">
                  <Tooltip title={t('presencePenaltyTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('presencePenalty')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>

                  <Box>
                    <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'presencePenalty']}>
                      <SliderNumberField
                        readOnly={readOnly}
                        min={model.presencePenaltyMin}
                        max={model.presencePenaltyMax}
                        step={0.1}
                        sx={{ flex: 1, backgroundColor: getDiffBackground('presencePenalty') }}
                        value={value.presencePenalty ?? project?.presencePenalty ?? model.presencePenaltyDefault}
                        onChange={(_, v) => (value.presencePenalty = v)}
                      />
                    </WithAwareness>

                    <AwarenessIndicator
                      projectId={projectId}
                      gitRef={gitRef}
                      path={[value.id, 'presencePenalty']}
                      sx={{ position: 'absolute', right: -16, top: 16 }}
                    />
                  </Box>
                </Box>
              )}

              {!isNil(model.frequencyPenaltyMin) && (
                <Box position="relative">
                  <Tooltip title={t('frequencyPenaltyTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('frequencyPenalty')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>

                  <Box>
                    <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'frequencyPenalty']}>
                      <SliderNumberField
                        readOnly={readOnly}
                        min={model.frequencyPenaltyMin}
                        max={model.frequencyPenaltyMax}
                        step={0.1}
                        sx={{ flex: 1, backgroundColor: getDiffBackground('frequencyPenalty') }}
                        value={value.frequencyPenalty ?? project?.frequencyPenalty ?? model.frequencyPenaltyDefault}
                        onChange={(_, v) => (value.frequencyPenalty = v)}
                      />
                    </WithAwareness>

                    <AwarenessIndicator
                      projectId={projectId}
                      gitRef={gitRef}
                      path={[value.id, 'frequencyPenalty']}
                      sx={{ position: 'absolute', right: -16, top: 16 }}
                    />
                  </Box>
                </Box>
              )}

              {!isNil(model.maxTokensMin) && (
                <Box position="relative">
                  <Tooltip title={t('maxTokensTip')} placement="top" disableInteractive>
                    <FormLabel>
                      {t('maxTokens')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>

                  <Box>
                    <WithAwareness projectId={projectId} gitRef={gitRef} path={[value.id, 'maxTokens']}>
                      <SliderNumberField
                        readOnly={readOnly}
                        min={model.maxTokensMin}
                        max={model.maxTokensMax}
                        step={1}
                        sx={{ flex: 1, backgroundColor: getDiffBackground('maxTokens') }}
                        value={value.maxTokens ?? project?.maxTokens ?? model.maxTokensDefault}
                        onChange={(_, v) => (value.maxTokens = v)}
                      />
                    </WithAwareness>

                    <AwarenessIndicator
                      projectId={projectId}
                      gitRef={gitRef}
                      path={[value.id, 'maxTokens']}
                      sx={{ position: 'absolute', right: -16, top: 16 }}
                    />
                  </Box>
                </Box>
              )}
            </>
          )}
        </Stack>
      </Collapse>
    </>
  );
}
