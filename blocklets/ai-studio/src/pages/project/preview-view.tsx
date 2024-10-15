import AppearanceSettings from '@app/components/file-editor/appearance/AppearanceSettings';
import { runtimeOutputVariableNames } from '@app/components/file-editor/output/type';
import { useCurrentProject } from '@app/contexts/project';
import { agentViewTheme } from '@app/theme/agent-view-theme';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { parseIdentity, stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AssistantYjs, RuntimeOutputVariable, fileFromYjs, isAssistant } from '@blocklet/ai-runtime/types';
import { RuntimeDebug } from '@blocklet/aigne-sdk/components';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, Dialog, DialogContent, DialogTitle, Stack, Tab, Tabs, TabsProps, ThemeProvider } from '@mui/material';
import sortBy from 'lodash/sortBy';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { nanoid } from 'nanoid';
import { ComponentProps, useEffect, useState } from 'react';

import { useDebugState } from './state';
import { useProjectStore } from './yjs-state';

export default function PreviewView(props: { projectId: string; gitRef: string; assistant: AssistantYjs }) {
  const { state, setCurrentSession } = useDebugState({
    projectId: props.projectId,
    assistantId: props.assistant.id,
  });

  useEffect(() => {
    if (!state.sessions.length) {
      return;
    }

    const current = state.sessions.find((i) => i.index === state.currentSessionIndex);
    if (!current) {
      setCurrentSession(state.sessions[state.sessions.length - 1]?.index);
    }
  });

  const { projectId, gitRef, assistant } = props;
  const { projectSetting, getFileById } = useProjectStore(projectId, gitRef);
  const aid = stringifyIdentity({ projectId, projectRef: gitRef, agentId: assistant.id });

  const [settingsProps, setSettingsProps] = useState<ComponentProps<typeof AppearanceSettings>>();
  const settingsState = usePopupState({ variant: 'dialog' });

  return (
    <>
      <ThemeProvider theme={agentViewTheme}>
        <Stack sx={{ overflowY: 'auto', flex: 1 }}>
          <RuntimeDebug
            aid={aid}
            getAgentYjs={(agentId) => {
              const agent = getFileById(agentId);
              if (!agent) throw new Error(`No such agent ${agentId}`);

              const convertToAgent = () => {
                const file = fileFromYjs((getYjsValue(agent) as Map<any>).toJSON());
                if (!isAssistant(file)) throw new Error(`Invalid agent file type ${agentId}`);

                return {
                  ...file,
                  project: projectSetting,
                  config: {
                    // TODO: get secrets
                    secrets: [],
                  },
                };
              };

              return {
                ...convertToAgent(),
                // TODO: throttle the update
                observe: (listener) => {
                  const yjs = getYjsValue(agent) as Map<any>;
                  const observer = () => listener(convertToAgent());
                  yjs.observeDeep(observer);
                  return () => yjs.unobserveDeep(observer);
                },
              };
            }}
            openOutputSettings={({ e, aid, output }) => {
              const { agentId } = parseIdentity(aid, { rejectWhenError: true });

              const agent = getFileById(agentId);
              if (!agent) throw new Error(`Agent ${agentId} not found`);

              let outputId;
              if ('id' in output) {
                outputId = output.id;
              } else {
                outputId = getOrAddOutputByName({ agent, outputName: output.name }).data.id;
              }

              setSettingsProps({ agentId, outputId });
              settingsState.open(e);
            }}
          />
        </Stack>
      </ThemeProvider>

      <Dialog {...bindDialog(settingsState)} maxWidth="md" fullWidth>
        <DialogTitle>Settings</DialogTitle>

        <DialogContent sx={{ minHeight: '50vh' }}>
          {settingsProps && (
            <AgentAppearanceSettings agentId={settingsProps.agentId} outputId={settingsProps.outputId} />
          )}
          {/* {settingsProps && <AppearanceSettings {...settingsProps} />} */}
        </DialogContent>
      </Dialog>
    </>
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

function AgentAppearanceSettings({ agentId, outputId }: { agentId: string; outputId: string }) {
  const [current, setCurrent] = useState(outputId);

  return (
    <>
      <AppearanceSettingTabs agentId={agentId} value={current} onChange={(_, v) => setCurrent(v)} />

      <Box my={2}>
        <AppearanceSettings agentId={agentId} outputId={current} />
      </Box>
    </>
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
      variant="scrollable"
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
