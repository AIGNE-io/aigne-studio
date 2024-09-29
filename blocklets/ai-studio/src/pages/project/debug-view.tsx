import { agentViewTheme } from '@app/theme/agent-view-theme';
<<<<<<< HEAD
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
=======
>>>>>>> 76e9a72a (feat: improve debug view)
import { ImagePreview } from '@blocklet/ai-kit/components';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AssistantYjs, fileFromYjs } from '@blocklet/ai-runtime/types';
import { AgentView } from '@blocklet/aigne-sdk/components';
import { getYjsValue } from '@blocklet/co-git/yjs';
<<<<<<< HEAD
import { Icon } from '@iconify-icon/react';
import HistoryIcon from '@iconify-icons/tabler/history';
import PlusIcon from '@iconify-icons/tabler/plus';
import TrashIcon from '@iconify-icons/tabler/trash';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Select,
  Stack,
  ThemeProvider,
  Tooltip,
  alpha,
  outlinedInputClasses,
  selectClasses,
  styled,
} from '@mui/material';
import { ComponentProps, useEffect, useMemo } from 'react';

import Empty from './icons/empty';
=======
import { Box, ThemeProvider, alpha, styled } from '@mui/material';
import { ComponentProps, useEffect, useMemo } from 'react';

>>>>>>> 76e9a72a (feat: improve debug view)
import { useDebugState } from './state';
import { useProjectStore } from './yjs-state';

export default function DebugView(props: { projectId: string; gitRef: string; assistant: AssistantYjs }) {
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

<<<<<<< HEAD
  return (
    <Box display="flex" flexDirection="column" flex={1} minHeight={0} key={state.currentSessionIndex}>
      <DebugViewContent {...props} />
      {!state.sessions.length && <EmptySessions projectId={props.projectId} templateId={props.assistant.id} />}
    </Box>
  );
}

function DebugViewContent(props: { projectId: string; gitRef: string; assistant: AssistantYjs }) {
  const { projectId, gitRef, assistant } = props;
  const { t } = useLocaleContext();
  const { state, clearCurrentSession, deleteSession } = useDebugState({
    projectId,
    assistantId: assistant.id,
  });

  const currentSession = state.sessions.find((i) => i.index === state.currentSessionIndex);

=======
  const { projectId, gitRef, assistant } = props;
>>>>>>> 76e9a72a (feat: improve debug view)
  const { projectSetting } = useProjectStore(projectId, gitRef);
  const aid = stringifyIdentity({ projectId, projectRef: gitRef, agentId: assistant.id });
  const debug = useMemo(
    () => ({
<<<<<<< HEAD
      session: currentSession,
      agent: assistant,
      restAgentProps: { project: projectSetting, config: { secrets: [] } },
      getYjsValue,
      fileFromYjs,
    }),
    [assistant, currentSession, projectSetting]
  );

  if (!currentSession) return null;

  return (
    <Box display="flex" flexDirection="column" minHeight={0}>
      <Box
        px={2.5}
        py={1.5}
        display="flex"
        justifyContent="space-between"
        bgcolor="background.paper"
        sx={{ zIndex: 2 }}>
        <Box maxWidth={200}>
          <SessionSelect projectId={projectId} assistantId={assistant.id} />
        </Box>

        <Stack direction="row" alignItems="center" gap={1} overflow="hidden">
          <Tooltip title={t('clearSession')} placement="bottom-end">
            <IconButton size="small" sx={{ color: '#000000' }} onClick={clearCurrentSession}>
              <Box fontSize={15} component={Icon} icon={HistoryIcon} />
            </IconButton>
          </Tooltip>

          <Tooltip title={t('deleteSession')} placement="bottom-end">
            <IconButton
              size="small"
              sx={{ color: '#E11D48' }}
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(currentSession.index);
              }}>
              <Box fontSize={15} component={Icon} icon={TrashIcon} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
      <Box overflow="auto" flex={1}>
        <ThemeProvider theme={agentViewTheme}>
          <AgentView aid={aid} debug={debug} working />
        </ThemeProvider>
      </Box>
    </Box>
  );
}

function SessionSelect({ projectId, assistantId }: { projectId: string; assistantId: string }) {
  const { t } = useLocaleContext();
  const { state, newSession, setCurrentSession } = useDebugState({
    projectId,
    assistantId,
  });

  return (
    <Select
      variant="standard"
      value={state.currentSessionIndex}
      placeholder={t('newObject', { object: t('session') })}
      fullWidth
      sx={{
        [`.${selectClasses.select}`]: {
          py: 0.5,
          '&:focus': {
            background: 'transparent',
          },
        },
        [`.${outlinedInputClasses.notchedOutline}`]: {
          borderRadius: 100,
        },
      }}
      renderValue={(value) => `${t('session')} ${value}`}
      onChange={(e) => setCurrentSession(e.target.value as number)}>
      {state.sessions.map((session) => (
        <MenuItem key={session.index} value={session.index}>
          {t('session')} {session.index}
        </MenuItem>
      ))}
      <MenuItem
        value="new"
        onClick={(e) => {
          e.preventDefault();
          newSession();
        }}
        sx={{ justifyContent: 'center', color: 'primary.main', fontSize: 'button.fontSize' }}>
        {t('newObject', { object: t('session') })}
      </MenuItem>
    </Select>
  );
}

function EmptySessions({ projectId, templateId }: { projectId: string; templateId: string }) {
  const { newSession } = useDebugState({ projectId, assistantId: templateId });
  const { t } = useLocaleContext();

  return (
    <Stack mt={10} gap={2} alignItems="center">
      <Empty sx={{ fontSize: 54, color: 'grey.300' }} />

      <Button
        startIcon={<Box component={Icon} icon={PlusIcon} />}
        onClick={(e) => {
          e.preventDefault();
          newSession();
        }}>
        {t('newObject', { object: t('session') })}
      </Button>
    </Stack>
=======
      agent: assistant,
      restAgentProps: {
        project: projectSetting,
        config: { secrets: [] },
      },
      getYjsValue,
      fileFromYjs,
    }),
    [assistant, projectSetting]
  );

  return (
    <ThemeProvider theme={agentViewTheme}>
      <Box sx={{ overflowY: 'auto' }}>
        <AgentView aid={aid} debug={debug} working />
      </Box>
    </ThemeProvider>
>>>>>>> 76e9a72a (feat: improve debug view)
  );
}

export const WritingIndicator = styled('span')`
  ${({ theme }) => `
    &:after {
      content: '';
      display: inline-block;
      vertical-align: middle;
      height: 1.2em;
      margin-top: -0.2em;
      margin-left: 0.1em;
      border-right: 0.2em solid ${alpha(theme.palette.primary.main, 0.4)};
      border-radius: 10px;
      animation: blink-caret 0.75s step-end infinite;

      @keyframes blink-caret {
        from,
        to {
          border-color: transparent;
        }
        50% {
          border-color: ${alpha(theme.palette.primary.main, 0.4)};
        }
      }
    }
  `}
`;

export function ImagePreviewB64({
  dataSource,
  ...props
}: Omit<ComponentProps<typeof ImagePreview>, 'dataSource'> & {
  dataSource: ({ url?: string; b64Json?: string } & Partial<
    NonNullable<ComponentProps<typeof ImagePreview>['dataSource']>[number]
  >)[];
}) {
  return (
    <ImagePreview
      {...props}
      dataSource={dataSource
        .map(({ src, url, b64Json, ...i }) => ({
          ...i,
          src: src || url || (b64Json && `data:image/png;base64,${b64Json}`),
        }))
        .filter((i): i is { src: string } => !!i.src)}
    />
  );
}
