import Toast from '@arcblock/ux/lib/Toast';
import MessageXIcon from '@iconify-icons/tabler/message-x';
import PlusIcon from '@iconify-icons/tabler/plus';
import SettingsIcon from '@iconify-icons/tabler/settings';
import TrashIcon from '@iconify-icons/tabler/trash';
import { Icon } from '@iconify/react';
import {
  Box,
  CircularProgress,
  Divider,
  MenuItem,
  Select,
  Stack,
  ThemeProvider,
  Tooltip,
  Typography,
  selectClasses,
  useTheme,
} from '@mui/material';
import pick from 'lodash/pick';
import { Suspense } from 'react';

import AgentSettingsDialog from '../../components/AgentSettings/AgentSettingsDialog';
import CustomComponentRenderer from '../../components/CustomComponentRenderer/CustomComponentRenderer';
import LoadingButton from '../../components/LoadingButton';
import ScrollView from '../../components/ScrollView';
import { AIGNEApiContextValue } from '../../contexts/Api';
import { useDebugGlobal } from '../../contexts/Debug';
import { useEntryAgent } from '../../contexts/EntryAgent';
import { RuntimeProvider } from '../../contexts/Runtime';
import { SessionProvider, useSession } from '../../contexts/Session';
import { useSessions } from '../../contexts/Sessions';
import { useAppearances } from '../../hooks/use-appearances';

export default function RuntimeDebug({
  aid,
  ApiProps,
  hideSessionsBar,
}: {
  aid: string;
  ApiProps?: Partial<AIGNEApiContextValue>;
  hideSessionsBar?: boolean;
}) {
  const hostTheme = useTheme();

  return (
    <RuntimeProvider aid={aid} working ApiProps={ApiProps}>
      {!hideSessionsBar && (
        <ThemeProvider theme={hostTheme}>
          <SessionsBar />

          <Divider />
        </ThemeProvider>
      )}

      <DebugView />
    </RuntimeProvider>
  );
}

function DebugView() {
  return (
    <Suspense
      fallback={
        <Box textAlign="center" my={4}>
          <CircularProgress size={24} />
        </Box>
      }>
      <Stack sx={{ flex: 1, flexDirection: 'column', overflow: 'hidden', transform: 'translate(0,0)' }}>
        <ScrollView
          initialScrollBehavior="auto"
          scroll="element"
          component={Stack}
          sx={{
            flex: 1,
            overflow: 'auto',
            overscrollBehavior: 'contain',
            position: 'relative',
            '> .ai-runtime-custom-component-renderer': {
              flexGrow: 1,
              display: 'flex',
              flexDirection: 'column',
            },
          }}>
          <AgentView />

          <AgentSettingsDialog />
        </ScrollView>
      </Stack>
    </Suspense>
  );
}

function AgentView() {
  const { aid } = useEntryAgent();
  const { appearancePage } = useAppearances();

  return (
    <CustomComponentRenderer
      aid={aid}
      output={appearancePage.outputSettings}
      componentId={appearancePage.componentId}
      properties={appearancePage.componentProperties}
      props={appearancePage.componentProps}
    />
  );
}

function SessionsBar() {
  const { sessions, loaded, createSession, setCurrentSessionId, currentSessionId } = useSessions((s) =>
    pick(s, ['sessions', 'loaded', 'createSession', 'setCurrentSessionId', 'currentSessionId'])
  );

  const setOpen = useDebugGlobal((s) => s.setOpen);

  const newSession = async () => {
    try {
      const session = await createSession({});
      setCurrentSessionId(session.id);
    } catch (error) {
      Toast.error(error.message);
      throw error;
    }
  };

  return (
    <Stack p={2} direction="row" alignItems="center" gap={2}>
      {loaded && !sessions?.length ? (
        <LoadingButton onClick={newSession}>New Session</LoadingButton>
      ) : (
        <>
          <Select
            variant="standard"
            disableUnderline
            size="small"
            autoWidth
            placeholder="Select a session"
            displayEmpty
            value={currentSessionId || ''}
            onChange={(e) => setCurrentSessionId(e.target.value)}
            sx={{
              maxWidth: 200,
              [`.${selectClasses.select}`]: {
                py: 0.5,
                '&:focus': {
                  background: 'transparent',
                },
              },
            }}>
            <MenuItem disabled value="">
              <Typography fontStyle="italic" color="text.secondary">
                Select session
              </Typography>
            </MenuItem>

            {sessions?.map((session) => (
              <MenuItem key={session.id} value={session.id}>
                {session.name || session.updatedAt}
              </MenuItem>
            ))}
          </Select>

          <Tooltip title="New session">
            <LoadingButton onClick={newSession} sx={{ minWidth: 32, minHeight: 32, p: 0 }}>
              <Icon icon={PlusIcon} fontSize={18} />
            </LoadingButton>
          </Tooltip>
        </>
      )}

      <Box flex={1} />

      <LoadingButton onClick={() => setOpen?.(true)} sx={{ minWidth: 32, minHeight: 32, p: 0 }}>
        <Icon icon={SettingsIcon} fontSize={18} />
      </LoadingButton>

      {currentSessionId && (
        <Suspense>
          <SessionProvider sessionId={currentSessionId}>
            <SessionActions />
          </SessionProvider>
        </Suspense>
      )}
    </Stack>
  );
}

function SessionActions() {
  const deleteSession = useSessions((s) => s.deleteSession);
  const { clearSession, sessionId } = useSession((s) => pick(s, 'clearSession', 'sessionId'));

  if (!sessionId) return null;

  return (
    <>
      <Tooltip title="Clean messages">
        <LoadingButton onClick={clearSession} sx={{ minWidth: 32, minHeight: 32, p: 0 }}>
          <Icon icon={MessageXIcon} fontSize={18} />
        </LoadingButton>
      </Tooltip>

      <Tooltip title="Delete current session">
        <LoadingButton
          onClick={() => deleteSession({ sessionId })}
          color="error"
          sx={{ minWidth: 32, minHeight: 32, p: 0 }}>
          <Icon icon={TrashIcon} fontSize={18} />
        </LoadingButton>
      </Tooltip>
    </>
  );
}
