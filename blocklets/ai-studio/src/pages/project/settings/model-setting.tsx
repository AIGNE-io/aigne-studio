import AgentSelect from '@app/components/agent-select';
import { TOOL_TIP_LEAVE_TOUCH_DELAY } from '@app/libs/constants';
import { useAgent } from '@app/store/agent';
import { getDefaultBranch } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { defaultTextModel } from '@blocklet/ai-runtime/common';
import { ParameterField } from '@blocklet/ai-runtime/components';
import { ProjectSettings, TextModelInfo } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, FormLabel, Stack, Tooltip, Typography } from '@mui/material';

import { AuthorizeButton } from '../../../components/file-editor/input/InputTable';
import ModelSelectField from '../../../components/selector/model-select-field';
import SliderNumberField from '../../../components/slider-number-field';
import { useReadOnly } from '../../../contexts/session';
import InfoOutlined from '../icons/question';
import { useProjectStore } from '../yjs-state';

export default function ModelSetting({
  projectId,
  projectRef,
  model,
}: {
  projectId: string;
  projectRef: string;
  model: TextModelInfo | undefined;
}) {
  const { t } = useLocaleContext();

  const readOnly = useReadOnly({ ref: getDefaultBranch() });

  const { projectSetting } = useProjectStore(projectId, projectRef);
  const setProjectSetting = (update: (v: typeof projectSetting) => void) => {
    const doc = (getYjsValue(projectSetting) as Map<any>).doc!;
    doc.transact(() => update(projectSetting));
  };

  return (
    <Stack gap={1}>
      <Box data-testid="prompt-setting" position="relative" className="between">
        <Box flex={1}>
          <FormLabel>{t('provider')}</FormLabel>
        </Box>

        <Box flex={1}>
          <AgentSelect
            readOnly={readOnly}
            type="llm-adapter"
            excludes={[]}
            autoFocus
            placeholder={t('llmProviderPlaceholder')}
            value={projectSetting.executor?.agent}
            onChange={(_, v) => {
              if (v) {
                setProjectSetting((config) => {
                  config.executor ??= {};

                  if (v.id !== config.executor.agent?.id && v.projectId !== config.executor.agent?.projectId) {
                    config.executor.inputValues = {};
                  }

                  config.executor.agent = {
                    blockletDid: v.blockletDid,
                    projectId: v.projectId,
                    id: v.id,
                  };
                });
              } else {
                delete projectSetting.executor?.agent;
              }
            }}
          />
        </Box>
      </Box>

      {projectSetting.executor?.agent?.id ? (
        <AgentParametersForm projectSetting={projectSetting} />
      ) : (
        <Stack gap={1}>
          <Box data-testid="project-setting-model">
            <Typography variant="subtitle2" mb={0.5}>
              {t('model')}
            </Typography>

            <ModelSelectField
              hiddenLabel
              fullWidth
              value={projectSetting?.model || defaultTextModel}
              onChange={(e) => {
                setProjectSetting((config) => {
                  config.model = e.target.value;
                });
              }}
              InputProps={{ readOnly }}
              sx={{ width: 1 }}
            />
          </Box>

          {model && (
            <Stack gap={1}>
              <Box className="prefer-inline">
                <Box>
                  <Tooltip
                    title={t('temperatureTip')}
                    placement="top"
                    disableInteractive
                    enterTouchDelay={0}
                    leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                    <FormLabel>
                      {t('temperature')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'bottom', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>
                </Box>

                <Box data-testid="project-settings-temperature">
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.temperatureMin}
                    max={model.temperatureMax}
                    step={0.1}
                    sx={{ flex: 1 }}
                    value={projectSetting?.temperature ?? model.temperatureDefault}
                    onChange={(_, v) => {
                      setProjectSetting((config) => {
                        config.temperature = v;
                      });
                    }}
                  />
                </Box>
              </Box>

              <Box className="prefer-inline">
                <Box>
                  <Tooltip
                    title={t('topPTip')}
                    placement="top"
                    disableInteractive
                    enterTouchDelay={0}
                    leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                    <FormLabel>
                      {t('topP')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'bottom', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>
                </Box>

                <Box data-testid="project-settings-topP">
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.topPMin}
                    max={model.topPMax}
                    step={0.1}
                    value={projectSetting?.topP ?? model.topPDefault}
                    onChange={(_, v) => {
                      setProjectSetting((config) => {
                        config.topP = v;
                      });
                    }}
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>

              <Box className="prefer-inline">
                <Box>
                  <Tooltip
                    title={t('presencePenaltyTip')}
                    placement="top"
                    disableInteractive
                    enterTouchDelay={0}
                    leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                    <FormLabel>
                      {t('presencePenalty')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'bottom', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>
                </Box>

                <Box data-testid="project-settings-presence-penalty">
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.presencePenaltyMin}
                    max={model.presencePenaltyMax}
                    step={0.1}
                    sx={{ flex: 1 }}
                    value={projectSetting?.presencePenalty ?? model.presencePenaltyDefault}
                    onChange={(_, v) => {
                      setProjectSetting((config) => {
                        config.presencePenalty = v;
                      });
                    }}
                  />
                </Box>
              </Box>

              <Box className="prefer-inline">
                <Box>
                  <Tooltip
                    title={t('frequencyPenaltyTip')}
                    placement="top"
                    disableInteractive
                    enterTouchDelay={0}
                    leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                    <FormLabel>
                      {t('frequencyPenalty')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'bottom', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>
                </Box>

                <Box data-testid="project-settings-frequency-penalty">
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.frequencyPenaltyMin}
                    max={model.frequencyPenaltyMax}
                    step={0.1}
                    sx={{ flex: 1 }}
                    value={projectSetting?.frequencyPenalty ?? model.frequencyPenaltyDefault}
                    onChange={(_, v) => {
                      setProjectSetting((config) => {
                        config.frequencyPenalty = v;
                      });
                    }}
                  />
                </Box>
              </Box>

              <Box className="prefer-inline">
                <Box>
                  <Tooltip
                    title={t('maxTokensTip')}
                    placement="top"
                    disableInteractive
                    enterTouchDelay={0}
                    leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
                    <FormLabel>
                      {t('maxTokens')}
                      <InfoOutlined fontSize="small" sx={{ verticalAlign: 'bottom', ml: 1, color: 'info.main' }} />
                    </FormLabel>
                  </Tooltip>
                </Box>

                <Box data-testid="project-settings-max-tokens">
                  <SliderNumberField
                    readOnly={readOnly}
                    min={model.maxTokensMin}
                    max={model.maxTokensMax}
                    step={1}
                    sx={{ flex: 1 }}
                    value={projectSetting?.maxTokens ?? model.maxTokensDefault}
                    onChange={(_, v) => {
                      setProjectSetting((config) => {
                        config.maxTokens = v;
                      });
                    }}
                  />
                </Box>
              </Box>
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}

function AgentParametersForm({ projectSetting }: { projectSetting: ProjectSettings }) {
  if (!projectSetting.executor?.agent?.id) throw new Error('Missing required parameter executor.agent.id');

  const { t } = useLocaleContext();
  const setProjectSetting = (update: (v: typeof projectSetting) => void) => {
    const doc = (getYjsValue(projectSetting) as Map<any>).doc!;
    doc.transact(() => update(projectSetting));
  };

  const agent = useAgent({
    type: 'llm-adapter',
    blockletDid: projectSetting.executor.agent.blockletDid,
    projectId: projectSetting.executor.agent.projectId,
    agentId: projectSetting.executor.agent.id,
  });

  if (!agent) return null;

  return (
    <Stack gap={1}>
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
                  hiddenLabel
                  parameter={data}
                  value={projectSetting.executor?.inputValues?.[data.key] || ''}
                  onChange={(value) => {
                    setProjectSetting((config) => {
                      config.executor ??= {};
                      config.executor.inputValues ??= {};
                      config.executor.inputValues[data.key!] = value;
                    });
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
