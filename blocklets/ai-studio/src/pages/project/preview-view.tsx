import { createOutputSettingsState } from '@app/components/file-editor/output/OutputActionsCell';
import { agentViewTheme } from '@app/theme/agent-view-theme';
import { parseIdentity, stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AssistantYjs, fileFromYjs, isAssistant } from '@blocklet/ai-runtime/types';
import { RuntimeDebug } from '@blocklet/aigne-sdk/components';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Stack, ThemeProvider } from '@mui/material';
import { useEffect } from 'react';

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

  return (
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
          openOutputSettings={({ aid, outputId }) => {
            const { agentId } = parseIdentity(aid, { rejectWhenError: true });
            createOutputSettingsState({ agentId, outputId }).getState().open();
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
