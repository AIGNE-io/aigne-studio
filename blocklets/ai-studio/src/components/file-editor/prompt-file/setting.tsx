import { TOOL_TIP_LEAVE_TOUCH_DELAY } from '@app/libs/constants';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { defaultTextModel, getSupportedModels } from '@blocklet/ai-runtime/common';
import { PromptAssistantYjs, RouterAssistantYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import HelpIcon from '@iconify-icons/tabler/help';
import { Box, FormLabel, Tooltip } from '@mui/material';
import isNil from 'lodash/isNil';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

import { useAssistantCompare, useProjectState } from '../../../pages/project/state';
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
}: {
  projectId: string;
  gitRef: string;
  value: PromptAssistantYjs | RouterAssistantYjs;
  readOnly?: boolean;
  compareValue?: PromptAssistantYjs | RouterAssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();

  const { getDiffBackground } = useAssistantCompare({ value, compareValue, readOnly, isRemoteCompare });
  const icon = <Box component={Icon} icon={HelpIcon} sx={{ fontSize: 16, color: '#9CA3AF', mt: 0.25 }} />;

  const { state } = useProjectState(projectId, gitRef);
  const { project } = state;
  const { value: supportedModels } = useAsync(() => getSupportedModels(), []);
  const model = useMemo(() => {
    return supportedModels?.find((i) => i.model === (value.model || project?.model || defaultTextModel));
  }, [value.model, project?.model, supportedModels]);

  return (
    <>
      <Box position="relative" className="between" sx={{ backgroundColor: getDiffBackground('temperature') }}>
        <Box flex={1}>
          <FormLabel>{t('model')}</FormLabel>
        </Box>

        <Box flex={1}>
          <WithAwareness sx={{ top: -2, right: -4 }} projectId={projectId} gitRef={gitRef} path={[value.id, 'model']}>
            <ModelSelectField
              hiddenLabel
              fullWidth
              value={value.model || project?.model || defaultTextModel}
              onChange={(e) => (value.model = e.target.value)}
              InputProps={{ readOnly, sx: { backgroundColor: getDiffBackground('model') } }}
            />
          </WithAwareness>
        </Box>
      </Box>

      {model && (
        <>
          {!isNil(model.temperatureMin) && (
            <Box position="relative" className="between" sx={{ backgroundColor: getDiffBackground('temperature') }}>
              <Box flex={1}>
                <Tooltip
                  title={t('temperatureTip')}
                  placement="top"
                  disableInteractive
                  enterTouchDelay={0}
                  leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                  <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
                    {t('temperature')}
                    {icon}
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
                <Tooltip
                  title={t('topPTip')}
                  placement="top"
                  disableInteractive
                  enterTouchDelay={0}
                  leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                  <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
                    {t('topP')}
                    {icon}
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
            <Box position="relative" className="between" sx={{ backgroundColor: getDiffBackground('presencePenalty') }}>
              <Box flex={1}>
                <Tooltip
                  title={t('presencePenaltyTip')}
                  placement="top"
                  disableInteractive
                  enterTouchDelay={0}
                  leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                  <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
                    {t('presencePenalty')}
                    {icon}
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
                <Tooltip
                  title={t('frequencyPenaltyTip')}
                  placement="top"
                  disableInteractive
                  enterTouchDelay={0}
                  leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                  <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
                    {t('frequencyPenalty')}
                    {icon}
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
                <Tooltip
                  title={t('maxTokensTip')}
                  placement="top"
                  disableInteractive
                  enterTouchDelay={0}
                  leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                  <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
                    {t('maxTokens')}
                    {icon}
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
    </>
  );
}
