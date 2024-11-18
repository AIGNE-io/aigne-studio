import { AIGNE_RUNTIME_MOUNT_POINT } from '@app/libs/constants';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { runAssistant } from '@blocklet/ai-runtime/api';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AssistantResponseType, AssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import BugIcon from '@iconify-icons/tabler/bug';
import RocketIcon from '@iconify-icons/tabler/rocket';
import TrashIcon from '@iconify-icons/tabler/trash';
import { Error } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Alert, Box, Button, Stack, Tooltip, Typography } from '@mui/material';
import { cloneDeep, sortBy } from 'lodash';
import { nanoid } from 'nanoid';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { joinURL } from 'ufo';

import { WritingIndicator } from './debug-view';
import { useDebugState } from './state';

export default function DebugView({
  projectId,
  gitRef,
  assistant,
  setCurrentTab,
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  setCurrentTab: (tab: string) => void;
}) {
  const { t } = useLocaleContext();
  const tests = sortBy(Object.values(assistant.tests ?? {}), 'index');

  const refs = useRef<{ [key: string]: ImperativeTestCaseView | null }>({});
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    try {
      setRunning(true);
      await Promise.all(
        Object.entries(refs.current)
          .filter(([id]) => assistant.tests?.[id])
          .map(([, ref]) => ref?.run())
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <Stack gap={1.5} overflow="auto">
      <Box />

      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        px={2}
        bgcolor="background.paper"
        sx={{ position: 'sticky', top: 0, zIndex: 2 }}>
        <Typography variant="subtitle3" color="#9CA3AF">
          {t('testCaseCount', { count: tests.length })}{' '}
        </Typography>

        <LoadingButton
          sx={{ py: 0 }}
          loading={running}
          onClick={runAll}
          startIcon={<Box component={Icon} icon={RocketIcon} sx={{ fontSize: 16 }} />}>
          {t('runAll')}
        </LoadingButton>
      </Stack>

      {tests.map(({ data }) => (
        <Box px={2} key={data.id} className="test-case">
          <TestCaseView
            ref={(ref) => (refs.current[data.id] = ref)}
            projectId={projectId}
            gitRef={gitRef}
            assistant={assistant}
            test={data}
            setCurrentTab={setCurrentTab}
          />
        </Box>
      ))}

      <Box />
    </Stack>
  );
}

interface ImperativeTestCaseView {
  run: () => Promise<any>;
}

const TestCaseView = forwardRef<
  ImperativeTestCaseView,
  {
    projectId: string;
    gitRef: string;
    assistant: AssistantYjs;
    test: NonNullable<AssistantYjs['tests']>[string]['data'];
    setCurrentTab: (tab: string) => void;
  }
>(({ projectId, gitRef, assistant, test, setCurrentTab }, ref) => {
  const { t } = useLocaleContext();

  const { newSession } = useDebugState({
    projectId,
    assistantId: assistant.id,
  });

  const debugTest = () => {
    newSession({ debugForm: cloneDeep(test.parameters), chatType: 'debug' });
    setCurrentTab('debug');
  };

  const deleteTest = () => {
    const doc = (getYjsValue(assistant) as Map<any>).doc!;
    doc.transact(() => {
      if (assistant.tests) {
        delete assistant.tests[test.id];
        sortBy(Object.values(assistant.tests), (i) => i.index).forEach((i, index) => (i.index = index));
      }
    });
  };

  const [loading, setLoading] = useState(false);

  const runTest = async () => {
    const doc = (getYjsValue(assistant) as Map<any>).doc!;
    doc.transact(() => {
      test.output = '';
      test.error = undefined;
    });
    setLoading(true);

    try {
      const result = await runAssistant({
        url: joinURL(AIGNE_RUNTIME_MOUNT_POINT, '/api/ai/call'),
        working: true,
        debug: true,
        aid: stringifyIdentity({ projectId, projectRef: gitRef, agentId: assistant.id }),
        sessionId: nanoid(),
        inputs: test.parameters,
      });

      const reader = result.getReader();
      const decoder = new TextDecoder();

      let response = '';
      let mainTaskId: string | undefined;

      for (;;) {
        const { value, done } = await reader.read();
        if (value) {
          if (value instanceof Uint8Array) {
            response += decoder.decode(value);
          } else if (typeof value === 'string') {
            response += value;
          } else if (value.type === AssistantResponseType.CHUNK) {
            mainTaskId ??= value.taskId;
            if (value.taskId === mainTaskId) {
              response += value.delta.content || '';
            }
          } else {
            console.error('Unknown AI response type', value);
          }

          test.output = response;
        }

        if (done) {
          break;
        }
      }
    } catch (error) {
      test.error = { message: error.message };
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({ run: runTest }));

  return (
    <>
      <Box className="between" mb={0.5} data-testid="test-case-view-header">
        <Typography variant="subtitle3">{t('output')}</Typography>

        <Stack direction="row" justifyContent="flex-end" mb={0.5}>
          <Tooltip title={t('runThisCase')}>
            <span>
              <Button
                data-testid="run-test"
                sx={{ minWidth: 0, width: 32, height: 32 }}
                size="small"
                disabled={loading}
                onClick={runTest}>
                <Box component={Icon} icon={RocketIcon} sx={{ fontSize: 15 }} />
              </Button>
            </span>
          </Tooltip>

          <Tooltip title={t('debugThisCase')}>
            <span>
              <Button sx={{ minWidth: 0, width: 32, height: 32 }} size="small" onClick={debugTest}>
                <Box component={Icon} icon={BugIcon} sx={{ fontSize: 15 }} />
              </Button>
            </span>
          </Tooltip>

          <Tooltip title={t('deleteThisCase')}>
            <span>
              <Button
                data-testid="delete-test"
                sx={{ minWidth: 0, width: 32, height: 32 }}
                size="small"
                onClick={deleteTest}
                color="warning">
                <Box component={Icon} icon={TrashIcon} sx={{ fontSize: 15 }} />
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      <Box
        data-testid="test-case-view-body"
        sx={{
          border: '1px solid #E5E7EB',
          background: '#F9FAFB',
          borderRadius: 1,
          whiteSpace: 'pre-wrap',
          p: 1.5,
        }}>
        {Object.entries(test.parameters).map(([key, value]) => (
          <Box
            key={key}
            sx={{
              background: '#fff',
              p: '6px 12px',
              borderRadius: 1,
              mb: 1,
              border: '1px solid #E5E7EB',
            }}>
            <Typography variant="subtitle3">{`${key}: ${value}`}</Typography>
          </Box>
        ))}

        <Typography variant="subtitle2" fontWeight={400}>
          {test.output}

          {loading && <WritingIndicator />}

          {test.error ? (
            <Box>
              <Alert variant="standard" color="error" icon={<Error />} sx={{ display: 'inline-flex', px: 1, py: 0 }}>
                {test.error.message}
              </Alert>
            </Box>
          ) : null}
        </Typography>
      </Box>
    </>
  );
});
