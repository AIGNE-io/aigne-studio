import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { PromptAssistantYjs, TextModelInfo } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import HelpIcon from '@iconify-icons/tabler/help';
import { Box, FormLabel, Stack, Tooltip } from '@mui/material';
import isEqual from 'lodash/isEqual';
import isNil from 'lodash/isNil';
import { useEffect, useState } from 'react';

import { useCurrentProject } from '../../../contexts/project';
import { TOOL_TIP_LEAVE_TOUCH_DELAY } from '../../../libs/constants';
import { useProjectStore } from '../../../pages/project/yjs-state';
import WithAwareness from '../../awareness/with-awareness';
import SliderNumberField from '../../slider-number-field';

interface Settings {
  temperature: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number;
}

const PRESETS = {
  precise: { temperature: 0.1, topP: 1, presencePenalty: 0, frequencyPenalty: 0 },
  balance: { temperature: 0.5, topP: 1, presencePenalty: 0, frequencyPenalty: 0 },
  creative: { temperature: 0.8, topP: 1, presencePenalty: 0, frequencyPenalty: 0 },
};

type PresetName = keyof typeof PRESETS | 'custom';

function normalizeSettings(settings: Partial<Settings>) {
  if (Object.values(settings).some((v) => !isNil(v))) {
    return {
      temperature: settings.temperature ?? 1,
      topP: settings.topP ?? 1,
      frequencyPenalty: settings.frequencyPenalty ?? 0,
      presencePenalty: settings.presencePenalty ?? 0,
    };
  }
  return { ...PRESETS.precise };
}

interface LLMModelSettingsProps {
  agent: PromptAssistantYjs;
  model: TextModelInfo;
}

export function LLMModelSettings({ agent, model }: LLMModelSettingsProps) {
  const { t } = useLocaleContext();
  const { projectId, projectRef } = useCurrentProject();
  const { projectSetting } = useProjectStore(projectId, projectRef);
  const [currentPreset, setCurrentPreset] = useState<PresetName>('precise');

  const value = normalizeSettings({
    temperature: agent.temperature ?? projectSetting?.temperature ?? model.temperatureDefault,
    topP: agent.topP ?? projectSetting?.topP ?? model.topPDefault,
    presencePenalty: agent.presencePenalty ?? projectSetting?.presencePenalty ?? model.presencePenaltyDefault,
    frequencyPenalty: agent.frequencyPenalty ?? projectSetting?.frequencyPenalty ?? model.frequencyPenaltyDefault,
  });

  const icon = <Box component={Icon} icon={HelpIcon} sx={{ fontSize: 16, color: '#9CA3AF', mt: 0.25 }} />;

  const handleOnChange = (value: Partial<Settings>) => {
    Object.assign(agent, value);
    setCurrentPreset('custom');
  };

  const handleSelectPreset = (preset: PresetName) => {
    if (preset !== currentPreset) {
      setCurrentPreset(preset);
      if (preset !== 'custom') {
        Object.assign(agent, PRESETS[preset]);
      }
    }
  };

  useEffect(() => {
    const preset = Object.entries(PRESETS).find(([, preset]) => isEqual(preset, value));
    setCurrentPreset((preset?.[0] as PresetName) || 'custom');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      <Stack
        direction="row"
        spacing={2}
        sx={{
          '> div': {
            width: '25%',
            border: '1px solid',
            borderColor: 'divider',
            py: 2,
            borderRadius: 1,
            textAlign: 'center',
            cursor: 'pointer',
            '&:hover, &.model-settings-preset-selected': {
              bgcolor: 'action.selected',
              borderColor: 'primary.main',
            },
          },
        }}>
        {(['precise', 'balance', 'creative', 'custom'] as PresetName[]).map((preset) => (
          <Box
            key={preset}
            className={preset === currentPreset ? 'model-settings-preset-selected' : ''}
            onClick={() => handleSelectPreset(preset)}>
            {t(`modelSettingsPresets.${preset}`)}
          </Box>
        ))}
      </Stack>
      <Stack gap={2} sx={{ py: 2, mt: 4 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Tooltip
            title={t('temperatureTip')}
            placement="top"
            disableInteractive
            enterTouchDelay={0}
            leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
            <FormLabel sx={{ flex: '0 0 50%', display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('temperature')}
              {icon}
            </FormLabel>
          </Tooltip>
          <Box sx={{ flex: 1 }}>
            <WithAwareness
              sx={{ top: -2, right: -4 }}
              projectId={projectId}
              gitRef={projectRef}
              path={[agent.id, 'temperature']}>
              <SliderNumberField
                sx={{ flex: 1 }}
                min={0}
                max={2}
                step={0.01}
                value={value.temperature}
                onChange={(_, v) => handleOnChange({ temperature: v as number })}
              />
            </WithAwareness>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Tooltip
            title={t('topPTip')}
            placement="top"
            disableInteractive
            enterTouchDelay={0}
            leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
            <FormLabel sx={{ flex: '0 0 50%', display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('topP')}
              {icon}
            </FormLabel>
          </Tooltip>
          <Box sx={{ flex: 1 }}>
            <WithAwareness
              sx={{ top: -2, right: -4 }}
              projectId={projectId}
              gitRef={projectRef}
              path={[agent.id, 'topP']}>
              <SliderNumberField
                sx={{ flex: 1 }}
                min={0}
                max={1}
                step={0.01}
                value={value.topP}
                onChange={(_, v) => handleOnChange({ topP: v as number })}
              />
            </WithAwareness>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Tooltip
            title={t('frequencyPenaltyTip')}
            placement="top"
            disableInteractive
            enterTouchDelay={0}
            leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
            <FormLabel sx={{ flex: '0 0 50%', display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('frequencyPenalty')}
              {icon}
            </FormLabel>
          </Tooltip>
          <Box sx={{ flex: 1 }}>
            <WithAwareness
              sx={{ top: -2, right: -4 }}
              projectId={projectId}
              gitRef={projectRef}
              path={[agent.id, 'presencePenalty']}>
              <SliderNumberField
                sx={{ flex: 1 }}
                min={-2}
                max={2}
                step={0.01}
                value={value.frequencyPenalty}
                onChange={(_, v) => handleOnChange({ frequencyPenalty: v as number })}
              />
            </WithAwareness>
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Tooltip
            title={t('presencePenaltyTip')}
            placement="top"
            disableInteractive
            enterTouchDelay={0}
            leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
            <FormLabel sx={{ flex: '0 0 50%', display: 'flex', alignItems: 'center', gap: 1 }}>
              {t('presencePenalty')}
              {icon}
            </FormLabel>
          </Tooltip>
          <Box sx={{ flex: 1 }}>
            <WithAwareness
              sx={{ top: -2, right: -4 }}
              projectId={projectId}
              gitRef={projectRef}
              path={[agent.id, 'frequencyPenalty']}>
              <SliderNumberField
                min={-2}
                max={2}
                step={0.01}
                value={value.presencePenalty}
                onChange={(_, v) => handleOnChange({ presencePenalty: v as number })}
              />
            </WithAwareness>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
}
