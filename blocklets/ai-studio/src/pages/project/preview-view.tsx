import AppearanceSettings from '@app/components/file-editor/appearance/AppearanceSettings';
import { runtimeOutputVariableNames } from '@app/components/file-editor/output/type';
import { useDebugAIGNEApiProps } from '@app/contexts/debug';
import { useCurrentProject } from '@app/contexts/project';
import { agentViewTheme } from '@app/theme/agent-view-theme';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import {
  DebugDialogProvider,
  DebugProvider,
  useDebug,
  useDebugDialog,
} from '@blocklet/ai-runtime/front/contexts/Debug';
import { AssistantYjs, RuntimeOutputVariable, isAssistant } from '@blocklet/ai-runtime/types';
import { RuntimeDebug } from '@blocklet/aigne-sdk/components/ai-runtime';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import CloseIcon from '@iconify-icons/tabler/x';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tab,
  TabProps,
  Tabs,
  TabsProps,
  ThemeProvider,
} from '@mui/material';
import sortBy from 'lodash/sortBy';
import { nanoid } from 'nanoid';
import React, { ComponentProps, ReactNode, useCallback } from 'react';

import { useProjectStore } from './yjs-state';

export default function PreviewView(props: { projectId: string; gitRef: string; assistant: AssistantYjs }) {
  const { projectId, gitRef, assistant } = props;
  const { getFileById } = useProjectStore(projectId, gitRef);
  const aid = stringifyIdentity({ projectId, projectRef: gitRef, agentId: assistant.id });

  const apiProps = useDebugAIGNEApiProps();

  const openSettings: ComponentProps<typeof DebugProvider>['openSettings'] = useCallback(
    ({ agentId, output }: { agentId: string; output: { id: string } | { name: RuntimeOutputVariable } }) => {
      const agent = getFileById(agentId);
      if (!agent) throw new Error(`Agent ${agentId} not found`);

      let outputId;
      if ('id' in output) {
        outputId = output.id;
      } else {
        outputId = getOrAddOutputByName({ agent, outputName: output.name }).data.id;
      }

      return { agentId, outputId };
    },
    []
  );

  return (
    <DebugDialogProvider>
      <ThemeProvider theme={agentViewTheme}>
        <Stack sx={{ overflowY: 'auto', flex: 1 }}>
          <DebugProvider>
            <RuntimeDebug aid={aid} ApiProps={apiProps} />
          </DebugProvider>
        </Stack>
      </ThemeProvider>

      <DebugProvider openSettings={openSettings} agentId={assistant.id}>
        <SettingsDialog>
          <RuntimeDebug hideSessionsBar aid={aid} ApiProps={apiProps} />
        </SettingsDialog>
      </DebugProvider>
    </DebugDialogProvider>
  );
}

function SettingsDialog({ children }: { children?: ReactNode }) {
  const { t } = useLocaleContext();
  const close = useDebug((s) => s.close);

  const open = useDebugDialog((s) => s.open);
  const setOpen = useDebugDialog((s) => s.setOpen);

  const onClose = () => {
    close?.();
    setOpen?.(false);
  };

  return (
    <Dialog
      open={!!open}
      fullWidth
      onClose={onClose}
      disableEnforceFocus
      slotProps={{
        paper: { sx: { maxWidth: 'none', height: '100%' } }
      }}>
      <DialogTitle sx={{ display: 'flex' }}>
        <Box sx={{
          flex: 1
        }}>{t('appearance')}</Box>

        <IconButton sx={{ p: 0, minWidth: 32, minHeight: 32 }} onClick={onClose}>
          <Icon icon={CloseIcon} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ padding: '0 !important' }}>
        <AgentAppearanceSettings>{children}</AgentAppearanceSettings>
      </DialogContent>
    </Dialog>
  );
}

const internalOutputs = new Set([
  RuntimeOutputVariable.profile,
  RuntimeOutputVariable.children,
  RuntimeOutputVariable.share,
  RuntimeOutputVariable.appearancePage,
  RuntimeOutputVariable.appearanceInput,
  RuntimeOutputVariable.appearanceOutput,
  RuntimeOutputVariable.openingMessage,
  RuntimeOutputVariable.openingQuestions,
]);

function AgentAppearanceSettings({ children }: { children?: ReactNode }) {
  const { t } = useLocaleContext();
  const agentId = useDebug((s) => s.agentId);
  const outputId = useDebug((s) => s.outputId);
  const open = useDebug((s) => s.open);
  const setHoverOutputId = useDebug((s) => s.setHoverOutputId);

  const { projectId, projectRef } = useCurrentProject();
  const { getFileById } = useProjectStore(projectId, projectRef);

  if (!agentId) return null;

  const agent = getFileById(agentId);
  const outputIdWithDefault =
    outputId ?? getOrAddOutputByName({ agent: agent!, outputName: RuntimeOutputVariable.appearancePage }).data.id;

  return (
    <Stack direction="row" sx={{
      height: "100%"
    }}>
      <Box sx={{
        py: 2
      }}>
        <Box sx={{ fontSize: 18, fontWeight: 'bold', mx: 'auto', textAlign: 'center', px: 3, pb: 2 }}>
          {agent?.name || t('unnamed')}
        </Box>

        <AppearanceSettingTabs
          sx={{ height: '100%' }}
          orientation="vertical"
          variant="scrollable"
          agentId={agentId}
          value={outputIdWithDefault}
          onChange={(_, v) => open?.({ output: { id: v } })}
          onTabHover={(v) => setHoverOutputId?.(v || '')}
          onTabMouseLeave={() => setHoverOutputId?.('')}
        />
      </Box>
      <Stack
        sx={{
          flex: 2,
          height: "100%"
        }}>
        {children}
      </Stack>
      <Box
        sx={{
          flex: 1,
          p: 2,
          height: "100%",
          overflow: 'auto',
          overscrollBehavior: 'contain'
        }}>
        {outputIdWithDefault && <AppearanceSettings agentId={agentId} outputId={outputIdWithDefault} />}
      </Box>
    </Stack>
  );
}

interface HoverableTabsProps extends TabsProps {
  onTabHover?: (value: string) => void;
  onTabMouseLeave?: () => void;
  TabProps?: Partial<TabProps>;
}

const HoverableTabs = ({ onTabHover, onTabMouseLeave, TabProps, ...props }: HoverableTabsProps) => {
  const hoveredTabId = useDebug((s) => s.tabId);

  return (
    <Tabs {...props}>
      {React.Children.map(props.children, (child) => {
        if (!React.isValidElement(child)) return child;

        return React.cloneElement(child, {
          ...TabProps,
          onMouseEnter: () => onTabHover?.(child.props.value),
          onMouseLeave: () => onTabMouseLeave?.(),
          ...child.props,
          sx: {
            backgroundColor: hoveredTabId === child.props.value ? 'action.hover' : undefined,
            ...child.props.sx,
          },
        });
      })}
    </Tabs>
  );
};

function AppearanceSettingTabs({
  agentId,
  onTabHover,
  onTabMouseLeave,
  ...props
}: { agentId: string; onTabHover?: (value: string) => void; onTabMouseLeave?: () => void } & TabsProps) {
  const { t } = useLocaleContext();

  const { projectId, projectRef } = useCurrentProject();
  const { getFileById } = useProjectStore(projectId, projectRef);

  const agent = getFileById(agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);
  if (!isAssistant(agent)) throw new Error(`File ${agentId} is not an agent`);

  const otherOutputs = Object.values(agent.outputVariables ?? {}).filter(
    (i) => !internalOutputs.has(i.data.name as any)
  );

  const outputNameIds = Object.fromEntries(
    Object.values(agent.outputVariables ?? {}).map((i) => [i.data.name, i.data.id])
  );

  const { value } = props;

  const current = (internalOutputs.has(value) && outputNameIds[value]) || value;

  return (
    <HoverableTabs
      {...props}
      value={current}
      onChange={(e, v) => {
        if (internalOutputs.has(v)) {
          v = getOrAddOutputByName({ agent, outputName: v }).data.id;
        }
        props.onChange?.(e, v);
      }}
      onTabHover={(value) => onTabHover?.(value)}
      onTabMouseLeave={() => onTabMouseLeave?.()}>
      <Tab value={outputNameIds[RuntimeOutputVariable.profile] || RuntimeOutputVariable.profile} label={t('profile')} />
      <Tab
        value={outputNameIds[RuntimeOutputVariable.children] || RuntimeOutputVariable.children}
        label={t('children')}
      />
      <Tab
        value={outputNameIds[RuntimeOutputVariable.appearancePage] || RuntimeOutputVariable.appearancePage}
        label={t('appearancePage')}
      />
      <Tab
        value={outputNameIds[RuntimeOutputVariable.appearanceInput] || RuntimeOutputVariable.appearanceInput}
        label={t('appearanceInput')}
      />
      <Tab
        value={outputNameIds[RuntimeOutputVariable.appearanceOutput] || RuntimeOutputVariable.appearanceOutput}
        label={t('appearanceOutput')}
      />
      <Tab
        value={outputNameIds[RuntimeOutputVariable.openingMessage] || RuntimeOutputVariable.openingMessage}
        label={t('openingMessage')}
      />
      <Tab
        value={outputNameIds[RuntimeOutputVariable.openingQuestions] || RuntimeOutputVariable.openingQuestions}
        label={t('openingQuestions')}
      />
      <Tab value={outputNameIds[RuntimeOutputVariable.share] || RuntimeOutputVariable.share} label={t('share')} />

      {otherOutputs.map((output) => {
        const o = runtimeOutputVariableNames.get(output.data.name!);
        return (
          <Tab
            key={output.data.id}
            value={output.data.id}
            label={o ? t(o.i18nKey) : output.data.name?.trim() || t('unnamed')}
          />
        );
      })}
    </HoverableTabs>
  );
}

function getOrAddOutputByName({ agent, outputName }: { agent: AssistantYjs; outputName: string }) {
  let outputId;

  const o = Object.values(agent.outputVariables ?? {}).find((i) => i.data.name === outputName);

  if (o) {
    outputId = o.data.id;
  } else {
    const id = nanoid();
    const doc = (getYjsValue(agent) as Map<any>).doc!;
    doc.transact(() => {
      agent.outputVariables ??= {};
      agent.outputVariables[id] = {
        index: Object.values(agent.outputVariables).length,
        data: { id, name: outputName },
      };
      sortBy(Object.values(agent.outputVariables), 'index').forEach((item, index) => (item.index = index));
    });
    outputId = id;
  }

  return agent.outputVariables![outputId]!;
}
