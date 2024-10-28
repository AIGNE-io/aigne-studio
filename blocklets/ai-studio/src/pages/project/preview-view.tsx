import AppearanceSettings from '@app/components/file-editor/appearance/AppearanceSettings';
import { runtimeOutputVariableNames } from '@app/components/file-editor/output/type';
import { useDebugAIGNEApiProps } from '@app/contexts/debug';
import { useCurrentProject } from '@app/contexts/project';
import { agentViewTheme } from '@app/theme/agent-view-theme';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { DebugProvider, useDebug } from '@blocklet/ai-runtime/front/contexts/Debug';
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
  Tabs,
  TabsProps,
  ThemeProvider,
} from '@mui/material';
import sortBy from 'lodash/sortBy';
import { nanoid } from 'nanoid';
import { ComponentProps, ReactNode, useCallback } from 'react';

import { useProjectStore } from './yjs-state';

export default function PreviewView(props: { projectId: string; gitRef: string; assistant: AssistantYjs }) {
  const { projectId, gitRef, assistant } = props;
  const { getFileById } = useProjectStore(projectId, gitRef);
  const aid = stringifyIdentity({ projectId, projectRef: gitRef, agentId: assistant.id });

  const apiProps = useDebugAIGNEApiProps();

  const openSettings: ComponentProps<typeof DebugProvider>['openSettings'] = useCallback(({ agentId, output }) => {
    const agent = getFileById(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    let outputId;
    if ('id' in output) {
      outputId = output.id;
    } else {
      outputId = getOrAddOutputByName({ agent, outputName: output.name }).data.id;
    }

    return { agentId, outputId };
  }, []);

  return (
    <DebugProvider openSettings={openSettings}>
      <ThemeProvider theme={agentViewTheme}>
        <Stack sx={{ overflowY: 'auto', flex: 1 }}>
          <RuntimeDebug aid={aid} ApiProps={apiProps} />
        </Stack>
      </ThemeProvider>

      <SettingsDialog>
        <RuntimeDebug hideSessionsBar aid={aid} ApiProps={apiProps} />
      </SettingsDialog>
    </DebugProvider>
  );
}

function SettingsDialog({ children }: { children?: ReactNode }) {
  const { t } = useLocaleContext();
  const agentId = useDebug((s) => s.agentId);
  const close = useDebug((s) => s.close);

  return (
    <Dialog open={!!agentId} fullWidth PaperProps={{ sx: { maxWidth: 'none', height: '100%' } }} onClose={close}>
      <DialogTitle sx={{ display: 'flex' }}>
        <Box flex={1}>{t('appearance')}</Box>

        <IconButton sx={{ p: 0, minWidth: 32, minHeight: 32 }} onClick={close}>
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
  const agentId = useDebug((s) => s.agentId);
  const outputId = useDebug((s) => s.outputId);
  const open = useDebug((s) => s.open);

  if (!agentId) return null;

  return (
    <Stack direction="row" height="100%">
      <Box py={2}>
        <AppearanceSettingTabs
          sx={{ height: '100%' }}
          orientation="vertical"
          variant="scrollable"
          agentId={agentId}
          value={outputId}
          onChange={(_, v) => open?.({ output: { id: v } })}
        />
      </Box>

      <Stack flex={2} height="100%">
        {children}
      </Stack>

      <Box flex={1} p={2} height="100%" sx={{ overflow: 'auto', overscrollBehavior: 'contain' }}>
        {outputId && <AppearanceSettings agentId={agentId} outputId={outputId} />}
      </Box>
    </Stack>
  );
}

function AppearanceSettingTabs({ agentId, ...props }: { agentId: string } & TabsProps) {
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
    <Tabs
      {...props}
      value={current}
      onChange={(e, v) => {
        if (internalOutputs.has(v)) {
          v = getOrAddOutputByName({ agent, outputName: v }).data.id;
        }
        props.onChange?.(e, v);
      }}>
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
    </Tabs>
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
