import AgentSelect from '@app/components/agent-select';
import { useCurrentProject } from '@app/contexts/project';
import { TOOL_TIP_LEAVE_TOUCH_DELAY } from '@app/libs/constants';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useAgent } from '@app/store/agent';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { defaultTextModel, getSupportedModels } from '@blocklet/ai-runtime/common';
import { ParameterField } from '@blocklet/ai-runtime/components';
import { AssistantYjs, PromptAssistantYjs, RouterAssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import HelpIcon from '@iconify-icons/tabler/help';
import { Box, FormLabel, Stack, Tooltip, Typography } from '@mui/material';
import isNil from 'lodash/isNil';
import { useMemo } from 'react';
import { useAsync } from 'react-use';

import { useAssistantCompare } from '../../../pages/project/state';
import WithAwareness from '../../awareness/with-awareness';
import ModelSelectField from '../../selector/model-select-field';
import SliderNumberField from '../../slider-number-field';
import { AuthorizeButton } from '../input/InputTable';

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

  return (
    <>
      <Box
        data-testid="prompt-setting"
        position="relative"
        className="between"
        sx={{ backgroundColor: getDiffBackground('executor') }}>
        <Box flex={1}>
          <FormLabel>{t('provider')}</FormLabel>
        </Box>

        <Box flex={1}>
          <WithAwareness
            sx={{ top: -2, right: -4 }}
            projectId={projectId}
            gitRef={gitRef}
            path={[value.id, 'executor']}>
            <AgentSelect
              readOnly={readOnly}
              type="llm-adapter"
              excludes={[value.id]}
              autoFocus
              placeholder={t('llmProviderPlaceholder')}
              value={value.executor?.agent}
              onChange={(_, v) => {
                const doc = (getYjsValue(value) as Map<any>).doc!;

                if (v) {
                  doc.transact(() => {
                    value.executor ??= {};

                    if (v.id !== value.executor.agent?.id && v.projectId !== value.executor.agent?.projectId) {
                      value.executor.inputValues = {};
                    }

                    value.executor.agent = {
                      blockletDid: v.blockletDid,
                      projectId: v.projectId,
                      id: v.id,
                    };
                  });
                } else {
                  delete value.executor?.agent;
                }
              }}
            />
          </WithAwareness>
        </Box>
      </Box>

      {value.executor?.agent?.id ? (
        <Stack>
          <AgentParametersForm assistant={value} />
        </Stack>
      ) : (
        <DefaultPromptSetting
          agent={value}
          readOnly={readOnly}
          compareValue={compareValue}
          isRemoteCompare={isRemoteCompare}
        />
      )}
    </>
  );
}

function AgentParametersForm({ assistant }: { assistant: AssistantYjs }) {
  if (!assistant.executor?.agent?.id) throw new Error('Missing required parameter executor.agent.id');

  const { t } = useLocaleContext();

  const agent = useAgent({
    type: 'llm-adapter',
    blockletDid: assistant.executor.agent.blockletDid,
    projectId: assistant.executor.agent.projectId,
    agentId: assistant.executor.agent.id,
  });

  if (!agent) return null;

  return (
    <Stack gap={2}>
      <AuthorizeButton agent={agent} />

      <Box>
        <Typography variant="subtitle2">{t('inputs')}</Typography>

        <Stack gap={1}>
          {agent.parameters?.map((data) => {
            if (data.hidden) return null;

            if (
              !data?.key ||
              data.type === 'source' ||
              [
                'aigcInputPrompt',
                'llmInputMessages',
                'llmInputTools',
                'llmInputToolChoice',
                'llmInputResponseFormat',
              ].includes(data.type!)
            )
              return null;

            return (
              <Stack key={data.id}>
                <Typography variant="caption">{data.label || data.key}</Typography>

                <ParameterField
                  label=""
                  hiddenLabel
                  parameter={data}
                  value={assistant.executor?.inputValues?.[data.key] || data.defaultValue || ''}
                  onChange={(value) => {
                    assistant.executor ??= {};
                    assistant.executor.inputValues ??= {};
                    assistant.executor.inputValues[data.key!] = value;
                  }}
                />
              </Stack>
            );
          })}
        </Stack>
      </Box>
    </Stack>
  );
}

function DefaultPromptSetting({
  agent,
  readOnly,
  compareValue,
  isRemoteCompare,
}: {
  agent: PromptAssistantYjs | RouterAssistantYjs;
  readOnly?: boolean;
  compareValue?: PromptAssistantYjs | RouterAssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const { t } = useLocaleContext();

  const { getDiffBackground } = useAssistantCompare({ value: agent, compareValue, readOnly, isRemoteCompare });
  const icon = <Box component={Icon} icon={HelpIcon} sx={{ fontSize: 16, color: '#9CA3AF', mt: 0.25 }} />;

  const { projectId, projectRef } = useCurrentProject();
  const { projectSetting } = useProjectStore(projectId, projectRef);
  const { value: supportedModels } = useAsync(() => getSupportedModels(), []);
  const model = useMemo(() => {
    return supportedModels?.find((i) => i.model === (agent.model || projectSetting?.model || defaultTextModel));
  }, [agent.model, projectSetting?.model, supportedModels]);

  return (
    <>
      <Box position="relative" className="between" sx={{ backgroundColor: getDiffBackground('model') }}>
        <Box flex={1}>
          <FormLabel>{t('model')}</FormLabel>
        </Box>

        <Box flex={1}>
          <WithAwareness
            sx={{ top: -2, right: -4 }}
            projectId={projectId}
            gitRef={projectRef}
            path={[agent.id, 'model']}>
            <ModelSelectField
              data-testid="prompt-setting-model"
              hiddenLabel
              fullWidth
              value={agent.model || projectSetting?.model || defaultTextModel}
              onChange={(e) => (agent.model = e.target.value)}
              InputProps={{ readOnly, sx: { backgroundColor: getDiffBackground('model') } }}
            />
          </WithAwareness>
        </Box>
      </Box>

      {model && (
        <>
          {!isNil(model.temperatureMin) && (
            <Box
              position="relative"
              data-testid="prompt-setting-temperature"
              className="between"
              sx={{ backgroundColor: getDiffBackground('temperature') }}>
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
                  gitRef={projectRef}
                  path={[agent.id, 'temperature']}>
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.temperatureMin}
                    max={model.temperatureMax}
                    step={0.1}
                    sx={{ flex: 1 }}
                    value={agent.temperature ?? projectSetting?.temperature ?? model.temperatureDefault}
                    onChange={(_, v) => (agent.temperature = v)}
                  />
                </WithAwareness>
              </Box>
            </Box>
          )}

          {!isNil(model.topPMin) && (
            <Box
              position="relative"
              className="between"
              data-testid="prompt-setting-topP"
              sx={{ backgroundColor: getDiffBackground('topP') }}>
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
                  gitRef={projectRef}
                  path={[agent.id, 'topP']}>
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.topPMin}
                    max={model.topPMax}
                    step={0.1}
                    value={agent.topP ?? projectSetting?.topP ?? model.topPDefault}
                    onChange={(_, v) => (agent.topP = v)}
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
              data-testid="prompt-setting-presencePenalty"
              sx={{ backgroundColor: getDiffBackground('presencePenalty') }}>
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
                  gitRef={projectRef}
                  path={[agent.id, 'presencePenalty']}>
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.presencePenaltyMin}
                    max={model.presencePenaltyMax}
                    step={0.1}
                    sx={{ flex: 1 }}
                    value={agent.presencePenalty ?? projectSetting?.presencePenalty ?? model.presencePenaltyDefault}
                    onChange={(_, v) => (agent.presencePenalty = v)}
                  />
                </WithAwareness>
              </Box>
            </Box>
          )}

          {!isNil(model.frequencyPenaltyMin) && (
            <Box
              position="relative"
              className="between"
              data-testid="prompt-setting-frequencyPenalty"
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
                  gitRef={projectRef}
                  path={[agent.id, 'frequencyPenalty']}>
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.frequencyPenaltyMin}
                    max={model.frequencyPenaltyMax}
                    step={0.1}
                    sx={{ flex: 1 }}
                    value={agent.frequencyPenalty ?? projectSetting?.frequencyPenalty ?? model.frequencyPenaltyDefault}
                    onChange={(_, v) => (agent.frequencyPenalty = v)}
                  />
                </WithAwareness>
              </Box>
            </Box>
          )}

          {!isNil(model.maxTokensMin) && (
            <Box
              position="relative"
              data-testid="prompt-setting-maxTokens"
              className="between"
              sx={{ backgroundColor: getDiffBackground('maxTokens') }}>
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
                  gitRef={projectRef}
                  path={[agent.id, 'maxTokens']}>
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.maxTokensMin}
                    max={model.maxTokensMax}
                    step={1}
                    sx={{ flex: 1 }}
                    value={Math.min(
                      agent?.maxTokens ?? projectSetting?.maxTokens ?? model.maxTokensDefault ?? 0,
                      model.maxTokensMax ?? 0
                    )}
                    onChange={(_, v) => (agent.maxTokens = v)}
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
