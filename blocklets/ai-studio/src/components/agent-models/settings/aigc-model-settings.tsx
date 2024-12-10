import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ImageAssistantYjs, ImageModelInfo } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import HelpIcon from '@iconify-icons/tabler/help';
import { Box, FormLabel, MenuItem, Stack, TextField, Tooltip } from '@mui/material';

import { useCurrentProject } from '../../../contexts/project';
import { TOOL_TIP_LEAVE_TOUCH_DELAY } from '../../../libs/constants';
import WithAwareness from '../../awareness/with-awareness';
import SliderNumberField from '../../slider-number-field';

interface AIGCModelSettingsProps {
  agent: ImageAssistantYjs;
  model: ImageModelInfo;
}

export function AIGCModelSettings({ agent, model }: AIGCModelSettingsProps) {
  const { t } = useLocaleContext();
  const { projectId, projectRef } = useCurrentProject();

  const icon = <Box component={Icon} icon={HelpIcon} sx={{ fontSize: 16, color: '#9CA3AF', mt: 0.25 }} />;

  return (
    <Stack spacing={2}>
      {typeof model.nMin === 'number' && typeof model.nMax === 'number' && (
        <Box position="relative" className="between">
          <Box flex={1}>
            <Tooltip
              title={t('numberTip')}
              placement="top"
              disableInteractive
              enterTouchDelay={0}
              leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
              <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
                {t('number')}
                {icon}
              </FormLabel>
            </Tooltip>
          </Box>

          <Box flex={1}>
            <WithAwareness sx={{ top: -2, right: -4 }} projectId={projectId} gitRef={projectRef} path={[agent.id, 'n']}>
              <SliderNumberField
                min={model.nMin}
                max={model.nMax}
                step={1}
                value={agent.n ?? model.nDefault}
                onChange={(_, v) => (agent.n = v)}
                sx={{ flex: 1 }}
              />
            </WithAwareness>
          </Box>
        </Box>
      )}

      {model.quality && model.quality.length > 0 && (
        <Box position="relative" className="between">
          <Box flex={1}>
            <Tooltip
              title={t('qualityTip')}
              placement="top"
              disableInteractive
              enterTouchDelay={0}
              leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
              <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
                {t('quality')}
                {icon}
              </FormLabel>
            </Tooltip>
          </Box>

          <Box flex={1} display="flex" justifyContent="flex-end">
            <WithAwareness
              sx={{ top: -2, right: -4 }}
              projectId={projectId}
              gitRef={projectRef}
              path={[agent.id, 'quality']}>
              <TextField
                hiddenLabel
                select
                SelectProps={{
                  autoWidth: true,
                }}
                value={agent.quality ?? model.qualityDefault}
                onChange={(e) => (agent.quality = e.target.value)}>
                {(model.quality || []).map((i) => (
                  <MenuItem key={i} value={i}>
                    {i}
                  </MenuItem>
                ))}
              </TextField>
            </WithAwareness>
          </Box>
        </Box>
      )}

      {model.size && model.size.length > 0 && (
        <Box position="relative" className="between">
          <Box flex={1}>
            <Tooltip
              title={t('sizeTip')}
              placement="top"
              disableInteractive
              enterTouchDelay={0}
              leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
              <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
                {t('size')}
                {icon}
              </FormLabel>
            </Tooltip>
          </Box>

          <Box flex={1} display="flex" justifyContent="flex-end">
            <WithAwareness
              sx={{ top: -2, right: -4 }}
              projectId={projectId}
              gitRef={projectRef}
              path={[agent.id, 'size']}>
              <TextField
                hiddenLabel
                select
                SelectProps={{
                  autoWidth: true,
                }}
                value={agent.size ?? model.sizeDefault}
                onChange={(e) => (agent.size = e.target.value)}>
                {model.size.map((i) => (
                  <MenuItem key={i} value={i}>
                    {i}
                  </MenuItem>
                ))}
              </TextField>
            </WithAwareness>
          </Box>
        </Box>
      )}

      {model.style && model.style.length > 0 && (
        <Box position="relative" className="between">
          <Box flex={1}>
            <Tooltip
              title={t('styleTip')}
              placement="top"
              disableInteractive
              enterTouchDelay={0}
              leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
              <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
                {t('style')}
                {icon}
              </FormLabel>
            </Tooltip>
          </Box>

          <Box flex={1} display="flex" justifyContent="flex-end">
            <WithAwareness
              sx={{ top: -2, right: -4 }}
              projectId={projectId}
              gitRef={projectRef}
              path={[agent.id, 'style']}>
              <TextField
                hiddenLabel
                select
                SelectProps={{
                  autoWidth: true,
                }}
                value={agent.style ?? model.styleDefault}
                onChange={(e) => (agent.style = e.target.value)}>
                {(model.style || []).map((i) => (
                  <MenuItem key={i} value={i}>
                    {i}
                  </MenuItem>
                ))}
              </TextField>
            </WithAwareness>
          </Box>
        </Box>
      )}
    </Stack>
  );
}
