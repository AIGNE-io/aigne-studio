import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { runAssistant } from '@blocklet/ai-runtime/api';
import { AssistantResponseType, AssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Error } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Alert, Box, Button, Stack, Tooltip, Typography, styled } from '@mui/material';
import { cloneDeep, sortBy } from 'lodash';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { joinURL } from 'ufo';

import { PREFIX } from '../../libs/api';
import { WritingIndicator } from './debug-view';
import RefreshSquareIcon from './solar-linear-icons/refresh-square';
import RulerCrossPen from './solar-linear-icons/ruler-cross-pen';
import TrashBinIcon from './solar-linear-icons/trash-bin';
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
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        px={2}
        py={1}
        bgcolor="background.paper"
        sx={{ position: 'sticky', top: 0, zIndex: 2 }}>
        <Typography ml={1} variant="subtitle1">
          {t('testCaseCount', { count: tests.length })}{' '}
        </Typography>

        <LoadingButton
          loading={running}
          loadingPosition="end"
          endIcon={<RefreshSquareIcon fontSize="small" />}
          onClick={runAll}>
          {t('runAll')}
        </LoadingButton>
      </Stack>

      {tests.map(({ data }) => (
        <Box px={2} key={data.id} mb={2}>
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
    </Box>
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
        url: joinURL(PREFIX, '/api/ai/call'),
        projectId,
        ref: gitRef,
        working: true,
        assistantId: assistant.id,
        parameters: test.parameters,
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
      <Stack direction="row" justifyContent="flex-end" mb={0.5}>
        <Tooltip title={t('runThisCase')}>
          <span>
            <Button sx={{ minWidth: 32 }} size="small" disabled={loading} onClick={runTest}>
              <RefreshSquareIcon fontSize="small" />
            </Button>
          </span>
        </Tooltip>

        <Tooltip title={t('debugThisCase')}>
          <Button sx={{ minWidth: 32 }} size="small" onClick={debugTest}>
            <RulerCrossPen fontSize="small" />
          </Button>
        </Tooltip>

        <Tooltip title={t('deleteThisCase')}>
          <Button sx={{ minWidth: 32 }} size="small" onClick={deleteTest} color="warning">
            <TrashBinIcon fontSize="small" />
          </Button>
        </Tooltip>
      </Stack>

      <Table>
        {Object.entries(test.parameters).map(([key, value]) => (
          <Box key={key}>
            <Box>
              <Box>{key}</Box>
            </Box>
            <Box>
              <Box>{value}</Box>
            </Box>
          </Box>
        ))}
        <Box>
          <Box>
            <Box>{t('output')}</Box>
          </Box>
          <Box>
            <Box whiteSpace="pre-wrap">
              {test.output}

              {loading && <WritingIndicator />}

              {test.error ? (
                <Box>
                  <Alert
                    variant="standard"
                    color="error"
                    icon={<Error />}
                    sx={{ display: 'inline-flex', px: 1, py: 0 }}>
                    {test.error.message}
                  </Alert>
                </Box>
              ) : null}
            </Box>
          </Box>
        </Box>
      </Table>
    </>
  );
});

const Table = styled(Box)`
  display: table;
  width: 100%;
  border: 0.5px solid ${({ theme }) => theme.palette.divider};
  border-radius: ${({ theme }) => theme.shape.borderRadius}px;

  > div {
    display: table-row;

    > div {
      display: table-cell;
      border-bottom: 0.5px solid ${({ theme }) => theme.palette.divider};
      border-right: 0.5px solid ${({ theme }) => theme.palette.divider};

      > div {
        max-height: 200px;
        overflow-x: hidden;
        overflow-y: auto;
        padding: 4px 8px;
        word-break: break-word;
      }

      &:first-of-type {
        min-width: 100px;
        vertical-align: top;
        color: ${({ theme }) => theme.palette.text.secondary};
      }

      &:last-of-type {
        width: 100%;
        border-right: none;
      }
    }

    &:last-of-type {
      > div {
        border-bottom: none;
      }
    }
  }
`;
