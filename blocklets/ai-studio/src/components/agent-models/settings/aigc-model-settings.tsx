import { UseAgentItem, useAgent } from '@app/store/agent';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ParameterField } from '@blocklet/ai-runtime/components';
import { ImageAssistantYjs, ImageModelInfo } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import HelpIcon from '@iconify-icons/tabler/help';
import { Box, FormLabel, MenuItem, Stack, SxProps, TextField, Tooltip, Typography } from '@mui/material';

import { useCurrentProject } from '../../../contexts/project';
import { TOOL_TIP_LEAVE_TOUCH_DELAY } from '../../../libs/constants';
import WithAwareness from '../../awareness/with-awareness';
import SliderNumberField from '../../slider-number-field';
import { useModelAdapterAgent } from '../use-models';

interface AIGCModelSettingsProps {
  agent: ImageAssistantYjs;
  model: ImageModelInfo;
}

interface SettingItemProps {
  label: string;
  tooltip: string;
  agentId: string;
  path: string[];
  sx?: SxProps;
  children: React.ReactElement<any>;
}

function SettingItem({ label, tooltip, agentId, path, sx = undefined, children }: SettingItemProps) {
  const { t } = useLocaleContext();
  const { projectId, projectRef } = useCurrentProject();
  const icon = <Box component={Icon} icon={HelpIcon} sx={{ fontSize: 16, color: 'grey.400', mt: 0.25 }} />;

  return (
    <Box
      className="between"
      sx={{
        position: 'relative',
      }}>
      <Box
        sx={{
          flex: 1,
        }}>
        <Tooltip
          title={t(tooltip)}
          placement="top"
          disableInteractive
          enterTouchDelay={0}
          leaveTouchDelay={TOOL_TIP_LEAVE_TOUCH_DELAY}>
          <FormLabel className="center" sx={{ gap: 1, justifyContent: 'flex-start' }}>
            {t(label)}
            {icon}
          </FormLabel>
        </Tooltip>
      </Box>
      <Box
        sx={[
          {
            flex: 1,
            display: 'flex',
            justifyContent: 'flex-end',
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}>
        <WithAwareness sx={{ top: -2, right: -4 }} projectId={projectId} gitRef={projectRef} path={[agentId, ...path]}>
          {children}
        </WithAwareness>
      </Box>
    </Box>
  );
}

function AgentParametersForm({
  adapterAgent,
  assistant,
}: {
  adapterAgent: UseAgentItem;
  assistant: ImageAssistantYjs;
}) {
  const { t } = useLocaleContext();

  const agent = useAgent({
    type: 'aigc-adapter',
    blockletDid: adapterAgent.identity.blockletDid,
    projectId: adapterAgent.identity.projectId,
    agentId: adapterAgent.identity.agentId,
  });

  if (!agent) return null;

  return (
    <Stack
      sx={{
        gap: 2,
      }}>
      <Box>
        <Typography variant="subtitle2">{t('inputs')}</Typography>

        <Stack
          sx={{
            gap: 1,
          }}>
          {agent.parameters?.map((data) => {
            if (data.hidden) return null;
            if (data.key === 'prompt' || data.key === 'model') return null;
            if (
              !data?.key ||
              data.type === 'source' ||
              ['llmInputMessages', 'llmInputTools', 'llmInputToolChoice', 'llmInputResponseFormat'].includes(data.type!)
            )
              return null;

            return (
              <Stack key={data.id}>
                <Typography variant="caption">{data.label || data.key}</Typography>

                <ParameterField
                  label=""
                  hiddenLabel
                  parameter={data}
                  value={assistant.modelSettings?.[data.key] || data.defaultValue || ''}
                  onChange={(value) => {
                    assistant.modelSettings ??= {};
                    assistant.modelSettings[data.key!] = value;
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

export function AIGCModelSettings({ agent, model }: AIGCModelSettingsProps) {
  const adapterAgent = useModelAdapterAgent(model.model, 'aigc');

  if (adapterAgent) {
    return <AgentParametersForm adapterAgent={adapterAgent} assistant={agent} />;
  }

  const quality = agent.quality && model.quality?.includes(agent.quality) ? agent.quality : model.qualityDefault;
  const size = agent.size && model.size?.includes(agent.size) ? agent.size : model.sizeDefault;

  return (
    <Stack spacing={2}>
      {typeof model.nMin === 'number' && typeof model.nMax === 'number' && (
        <SettingItem label="number" tooltip="numberTip" agentId={agent.id} path={['n']} sx={{ display: 'block' }}>
          <SliderNumberField
            min={model.nMin}
            max={model.nMax}
            step={1}
            value={agent.n ?? model.nDefault}
            onChange={(_, v) => (agent.n = v)}
            sx={{ flex: 1 }}
          />
        </SettingItem>
      )}
      {model.quality && model.quality.length > 0 && (
        <SettingItem label="quality" tooltip="qualityTip" agentId={agent.id} path={['quality']}>
          <TextField
            hiddenLabel
            select
            value={quality}
            onChange={(e) => (agent.quality = e.target.value)}
            slotProps={{
              select: { autoWidth: true },
            }}>
            {(model.quality || []).map((i) => (
              <MenuItem key={i} value={i}>
                {i}
              </MenuItem>
            ))}
          </TextField>
        </SettingItem>
      )}
      {model.size && model.size.length > 0 && (
        <SettingItem label="size" tooltip="sizeTip" agentId={agent.id} path={['size']}>
          <TextField
            hiddenLabel
            select
            value={size}
            onChange={(e) => (agent.size = e.target.value)}
            slotProps={{
              select: { autoWidth: true },
            }}>
            {model.size.map((i) => (
              <MenuItem key={i} value={i}>
                {i}
              </MenuItem>
            ))}
          </TextField>
        </SettingItem>
      )}
      {model.style && model.style.length > 0 && (
        <SettingItem label="style" tooltip="styleTip" agentId={agent.id} path={['style']}>
          <TextField
            hiddenLabel
            select
            value={agent.style ?? model.styleDefault}
            onChange={(e) => (agent.style = e.target.value)}
            slotProps={{
              select: { autoWidth: true },
            }}>
            {(model.style || []).map((i) => (
              <MenuItem key={i} value={i}>
                {i}
              </MenuItem>
            ))}
          </TextField>
        </SettingItem>
      )}
      {model.background && model.background.length > 0 && (
        <SettingItem label="background" tooltip="backgroundTip" agentId={agent.id} path={['background']}>
          <TextField
            hiddenLabel
            select
            value={agent.background ?? model.backgroundDefault}
            onChange={(e) => (agent.background = e.target.value)}
            slotProps={{
              select: { autoWidth: true },
            }}>
            {(model.background || []).map((i) => (
              <MenuItem key={i} value={i}>
                {i}
              </MenuItem>
            ))}
          </TextField>
        </SettingItem>
      )}
      {model.outputFormat && model.outputFormat.length > 0 && (
        <SettingItem
          label="gptImageOutputFormat"
          tooltip="gptImageOutputFormatTip"
          agentId={agent.id}
          path={['outputFormat']}>
          <TextField
            hiddenLabel
            select
            value={agent.outputFormat ?? model.outputFormatDefault}
            onChange={(e) => (agent.outputFormat = e.target.value)}
            slotProps={{
              select: { autoWidth: true },
            }}>
            {(model.outputFormat || []).map((i) => (
              <MenuItem key={i} value={i}>
                {i}
              </MenuItem>
            ))}
          </TextField>
        </SettingItem>
      )}
      {model.moderation && model.moderation.length > 0 && (
        <SettingItem label="moderation" tooltip="moderationTip" agentId={agent.id} path={['moderation']}>
          <TextField
            hiddenLabel
            select
            value={agent.moderation ?? model.moderationDefault}
            onChange={(e) => (agent.moderation = e.target.value)}
            slotProps={{
              select: { autoWidth: true },
            }}>
            {(model.moderation || []).map((i) => (
              <MenuItem key={i} value={i}>
                {i}
              </MenuItem>
            ))}
          </TextField>
        </SettingItem>
      )}
      {typeof model.outputCompressionMin === 'number' && typeof model.outputCompressionMax === 'number' && (
        <SettingItem
          label="outputCompression"
          tooltip="outputCompressionTip"
          agentId={agent.id}
          path={['outputCompression']}
          sx={{ display: 'block' }}>
          <SliderNumberField
            min={model.outputCompressionMin}
            max={model.outputCompressionMax}
            step={1}
            value={agent.outputCompression ?? model.outputCompressionDefault ?? 0}
            onChange={(_, v) => (agent.outputCompression = v)}
            sx={{ flex: 1 }}
          />
        </SettingItem>
      )}
    </Stack>
  );
}
