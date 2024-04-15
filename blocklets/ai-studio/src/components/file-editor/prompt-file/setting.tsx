import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { PromptAssistantYjs } from '@blocklet/ai-runtime/types';
import { ExpandMoreRounded, InfoOutlined } from '@mui/icons-material';
import { Box, Collapse, FormLabel, Stack, Tooltip, Typography } from '@mui/material';
import isNil from 'lodash/isNil';
import { useMemo, useState } from 'react';
import { useAsync } from 'react-use';

import { getSupportedModels } from '../../../../api/src/libs/common';
import { useAssistantCompare, useProjectState } from '../../../pages/project/state';
import WithAwareness from '../../awareness/with-awareness';
import ModelSelectField, { brandIcon } from '../../selector/model-select-field';
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
    <Box sx={{ border: '1px solid #E5E7EB', p: '8px 16px', borderRadius: 1 }}>
      <Stack
        direction="row"
        alignItems="center"
        gap={0.5}
        sx={{
          fontWeight: 500,
          fontSize: 14,
          lineHeight: '24px',
          color: '#030712',
          cursor: 'pointer',
        }}
        onClick={() => setOpen(!open)}>
        <Typography variant="subtitle2">{t('callPrompt')}</Typography>

        <Stack direction="row" flex={1} overflow="hidden" alignItems="center" justifyContent="flex-end">
          {!open && (
            <Stack direction="row" alignItems="center" gap={0.5}>
              {model && <Box className="center">{brandIcon(model!.brand)}</Box>}
              <Typography variant="subtitle3" color="#030712">
                {model?.name || model?.model || project?.model}
              </Typography>
            </Stack>
          )}
        </Stack>

        <ExpandMoreRounded
          sx={{
            transform: !open ? 'rotateZ(270deg)' : 'rotateZ(360deg)',
            transition: (theme) => theme.transitions.create('all'),
            color: '#030712',
            fontSize: 18,
            mt: 0.25,
          }}
        />
      </Stack>

      <Collapse in={open}>
        <Stack pt={1.5} gap={1.5}>
          <WithAwareness sx={{ top: -2, right: -4 }} projectId={projectId} gitRef={gitRef} path={[value.id, 'model']}>
            <ModelSelectField
              fullWidth
              label={t('model')}
              value={value.model || project?.model || ''}
              onChange={(e) => (value.model = e.target.value)}
              InputProps={{ readOnly, sx: { backgroundColor: getDiffBackground('model') } }}
            />
          </WithAwareness>

          {model && (
            <>
              {!isNil(model.temperatureMin) && (
                <Box position="relative" className="between" sx={{ backgroundColor: getDiffBackground('temperature') }}>
                  <Box flex={1}>
                    <Tooltip title={t('temperatureTip')} placement="top" disableInteractive>
                      <FormLabel>
                        {t('temperature')}
                        <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                      </FormLabel>
                    </Tooltip>
                  </Box>

                  <Box flex={1}>
                    <WithAwareness
                      sx={{ top: -2, right: -4 }}
                      projectId={projectId}
                      gitRef={gitRef}
                      path={[value.id, 'temperature']}>
                      <SliderNumberField
                        readOnly={readOnly}
                        min={model.temperatureMin}
                        max={model.temperatureMax}
                        step={0.1}
                        sx={{ flex: 1 }}
                        value={value.temperature ?? project?.temperature ?? model.temperatureDefault}
                        onChange={(_, v) => (value.temperature = v)}
                      />
                    </WithAwareness>
                  </Box>
                </Box>
              )}

              {!isNil(model.topPMin) && (
                <Box position="relative" className="between" sx={{ backgroundColor: getDiffBackground('topP') }}>
                  <Box flex={1}>
                    <Tooltip title={t('topPTip')} placement="top" disableInteractive>
                      <FormLabel>
                        {t('topP')}
                        <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                      </FormLabel>
                    </Tooltip>
                  </Box>

                  <Box flex={1}>
                    <WithAwareness
                      sx={{ top: -2, right: -4 }}
                      projectId={projectId}
                      gitRef={gitRef}
                      path={[value.id, 'topP']}>
                      <SliderNumberField
                        readOnly={readOnly}
                        min={model.topPMin}
                        max={model.topPMax}
                        step={0.1}
                        value={value.topP ?? project?.topP ?? model.topPDefault}
                        onChange={(_, v) => (value.topP = v)}
                        sx={{ flex: 1 }}
                      />
                    </WithAwareness>
                  </Box>
                </Box>
              )}

              {!isNil(model.presencePenaltyMin) && (
                <Box
                  position="relative"
                  className="between"
                  sx={{ backgroundColor: getDiffBackground('presencePenalty') }}>
                  <Box flex={1}>
                    <Tooltip title={t('presencePenaltyTip')} placement="top" disableInteractive>
                      <FormLabel>
                        {t('presencePenalty')}
                        <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                      </FormLabel>
                    </Tooltip>
                  </Box>

                  <Box flex={1}>
                    <WithAwareness
                      sx={{ top: -2, right: -4 }}
                      projectId={projectId}
                      gitRef={gitRef}
                      path={[value.id, 'presencePenalty']}>
                      <SliderNumberField
                        readOnly={readOnly}
                        min={model.presencePenaltyMin}
                        max={model.presencePenaltyMax}
                        step={0.1}
                        sx={{ flex: 1 }}
                        value={value.presencePenalty ?? project?.presencePenalty ?? model.presencePenaltyDefault}
                        onChange={(_, v) => (value.presencePenalty = v)}
                      />
                    </WithAwareness>
                  </Box>
                </Box>
              )}

              {!isNil(model.frequencyPenaltyMin) && (
                <Box
                  position="relative"
                  className="between"
                  sx={{ backgroundColor: getDiffBackground('frequencyPenalty') }}>
                  <Box flex={1}>
                    <Tooltip title={t('frequencyPenaltyTip')} placement="top" disableInteractive>
                      <FormLabel>
                        {t('frequencyPenalty')}
                        <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                      </FormLabel>
                    </Tooltip>
                  </Box>

                  <Box flex={1}>
                    <WithAwareness
                      sx={{ top: -2, right: -4 }}
                      projectId={projectId}
                      gitRef={gitRef}
                      path={[value.id, 'frequencyPenalty']}>
                      <SliderNumberField
                        readOnly={readOnly}
                        min={model.frequencyPenaltyMin}
                        max={model.frequencyPenaltyMax}
                        step={0.1}
                        sx={{ flex: 1 }}
                        value={value.frequencyPenalty ?? project?.frequencyPenalty ?? model.frequencyPenaltyDefault}
                        onChange={(_, v) => (value.frequencyPenalty = v)}
                      />
                    </WithAwareness>
                  </Box>
                </Box>
              )}

              {!isNil(model.maxTokensMin) && (
                <Box position="relative" className="between" sx={{ backgroundColor: getDiffBackground('maxTokens') }}>
                  <Box flex={1}>
                    <Tooltip title={t('maxTokensTip')} placement="top" disableInteractive>
                      <FormLabel>
                        {t('maxTokens')}
                        <InfoOutlined fontSize="small" sx={{ verticalAlign: 'middle', ml: 1, color: 'info.main' }} />
                      </FormLabel>
                    </Tooltip>
                  </Box>

                  <Box flex={1}>
                    <WithAwareness
                      sx={{ top: -2, right: -4 }}
                      projectId={projectId}
                      gitRef={gitRef}
                      path={[value.id, 'maxTokens']}>
                      <SliderNumberField
                        readOnly={readOnly}
                        min={model.maxTokensMin}
                        max={model.maxTokensMax}
                        step={1}
                        sx={{ flex: 1 }}
                        value={Math.min(
                          value?.maxTokens ?? project?.maxTokens ?? model.maxTokensDefault ?? 0,
                          model.maxTokensMax ?? 0
                        )}
                        onChange={(_, v) => (value.maxTokens = v)}
                      />
                    </WithAwareness>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Stack>
      </Collapse>
    </Box>
  );
}
