import ErrorCard from '@app/components/error-card';
import ErrorBoundary from '@app/components/error/error-boundary';
import MdViewer from '@app/components/md-viewer';
import BasicTree from '@app/components/trace';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { ImagePreview } from '@blocklet/ai-kit/components';
import { ParameterField } from '@blocklet/ai-runtime/components';
import { AssistantYjs, isPromptAssistant, parameterFromYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { cx } from '@emotion/css';
import { Icon } from '@iconify-icon/react';
import { Add, CopyAll } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  accordionSummaryClasses,
  alertClasses,
  alpha,
  outlinedInputClasses,
  selectClasses,
  styled,
} from '@mui/material';
import { useLocalStorageState, useThrottleEffect } from 'ahooks';
import dayjs from 'dayjs';
import { pick, sortBy } from 'lodash';
import cloneDeep from 'lodash/cloneDeep';
import { nanoid } from 'nanoid';
import { ComponentProps, SyntheticEvent, memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Virtuoso } from 'react-virtuoso';

import { useSessionContext } from '../../contexts/session';
import Empty from './icons/empty';
import Record from './icons/record';
import SegmentedControl from './segmented-control';
import { SessionItem, useDebugState, useProjectState } from './state';

export default function DebugView(props: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  setCurrentTab: (tab: string) => void;
}) {
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

  return (
    <Box display="flex" flexDirection="column" flex={1} key={state.currentSessionIndex}>
      <DebugViewContent {...props} />
      {!state.sessions.length && <EmptySessions projectId={props.projectId} templateId={props.assistant.id} />}
    </Box>
  );
}

function DebugViewContent({
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

  const { state, setSession, clearCurrentSession, deleteSession } = useDebugState({
    projectId,
    assistantId: assistant.id,
  });

  const currentSession = state.sessions.find((i) => i.index === state.currentSessionIndex);

  if (!currentSession) return null;

  return (
    <>
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
              <Box fontSize={15} component={Icon} icon="tabler:history" />
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
              <Box fontSize={15} component={Icon} icon="tabler:trash" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <ScrollMessages currentSession={currentSession} key={assistant.id} />

      <Stack gap={1.5} sx={{ bgcolor: 'background.paper', p: '12px 20px', borderTop: '1px solid #E5E7EB' }}>
        {currentSession.chatType === 'chat' ? (
          <ChatModeForm projectId={projectId} gitRef={gitRef} assistant={assistant} />
        ) : (
          <DebugModeForm projectId={projectId} gitRef={gitRef} assistant={assistant} setCurrentTab={setCurrentTab} />
        )}

        <Box textAlign="center">
          <SegmentedControl
            value={currentSession.chatType ?? 'debug'}
            options={[
              { value: 'debug', label: t('debug') },
              { value: 'chat', label: t('chat') },
            ]}
            onChange={(v: any) => {
              if (v)
                setSession(currentSession.index, (session) => {
                  session.chatType = v;
                });
            }}
          />
        </Box>
      </Stack>
    </>
  );
}

function ScrollMessages({ currentSession }: { currentSession: SessionItem }) {
  const autoScroll = useRef(true);
  const [hitBottom, setHitBottom] = useState(true);
  const viewportRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const container = viewportRef.current;
    if (container && autoScroll.current) {
      requestAnimationFrame(() =>
        container.scroll({
          top: container.scrollHeight,
          behavior,
        })
      );
    }
  }, []);

  const handleScroll = (e: HTMLDivElement) => {
    const isTouchBottom = e.scrollTop + e.offsetHeight >= e.scrollHeight - 20;
    setHitBottom(isTouchBottom);
  };

  const assistantArray = currentSession.messages.filter((i) => i.role === 'assistant');
  const lastAssistantContent = currentSession.messages[currentSession.messages.length - 1]?.content;

  useEffect(() => {
    autoScroll.current = true;
    if (assistantArray.length > 0 && autoScroll.current) {
      setTimeout(() => {
        scrollToBottom('smooth');
      }, 500);
    }
  }, [assistantArray.length, scrollToBottom]);

  useThrottleEffect(
    () => {
      if (autoScroll.current && lastAssistantContent) {
        scrollToBottom('smooth');
      }
    },
    [lastAssistantContent, scrollToBottom],
    { wait: 300 }
  );

  return (
    <Box
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        background: '#F9FAFB',
      }}>
      <Box
        py={1.5}
        position="relative"
        display="flex"
        flexGrow={1}
        height={0}
        flexDirection="column"
        sx={{
          overflowY: 'scroll',
          overflowX: 'hidden',
        }}
        ref={viewportRef}
        onScroll={(e) => handleScroll(e.currentTarget)}
        onWheel={(e) => {
          return (autoScroll.current = hitBottom && e.deltaY > 0);
        }}
        onTouchStart={() => {
          autoScroll.current = false;
        }}>
        <Virtuoso
          customScrollParent={viewportRef.current!}
          data={currentSession.messages}
          initialTopMostItemIndex={currentSession.messages.length - 1}
          computeItemKey={(_, item) => item.id}
          itemContent={(index, message) => (
            <MessageView index={index} chatType={currentSession.chatType ?? 'chat'} message={message} />
          )}
        />
      </Box>
      {!hitBottom && (
        <Box
          onClick={() => {
            const container = viewportRef.current;
            if (container) {
              container.scroll({
                top: container.scrollHeight,
                behavior: 'smooth',
              });
            }
          }}
          sx={{
            bgcolor: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '10px',
            borderWidth: 0,
            bottom: 5,
            cursor: 'pointer',
            height: 20,
            position: 'absolute',
            right: 20,
            width: 20,
          }}
        />
      )}
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

const MessageView = memo(
  ({
    message,
    chatType,
    index,
  }: {
    message: SessionItem['messages'][number];
    chatType?: 'chat' | 'debug';
    index: number;
  }) => {
    return (
      <ErrorBoundary>
        <Stack mt={message.role === 'user' && index !== 0 ? 4 : 0}>
          {message.role === 'user' && (
            <Typography alignSelf="center" ml={0.5} component="span" color="text.secondary" whiteSpace="nowrap">
              {dayjs(message.createdAt).format('YYYY-MM-DD HH:mm:ss')}
            </Typography>
          )}
          <Stack px={2.5} py={1} gap={1} flexDirection="row" position="relative">
            <Avatar sx={{ width: 24, height: 24, fontSize: 14 }}>{message.role.slice(0, 1).toUpperCase()}</Avatar>
            <Box sx={{ overflowX: 'hidden', flexGrow: 1 }}>
              <BasicTree inputs={message.inputMessages} />
              <Box
                flex={1}
                sx={{
                  [`.${alertClasses.icon},.${alertClasses.message}`]: { py: '5px' },
                }}>
                {message.messages?.map((message) => (
                  <Stack
                    key={message.taskId}
                    sx={message.responseAs === 'systemMessage' ? { color: 'text.secondary' } : {}}>
                    {message.content && <MdViewer content={message.content} />}

                    {!!message.images?.length && (
                      <ImagePreviewB64 itemWidth={100} spacing={1} dataSource={message.images} />
                    )}
                  </Stack>
                ))}

                {(message.content || message.images?.length || message.loading) &&
                (chatType !== 'debug' || !message?.inputMessages?.length) ? (
                  <MessageViewContent
                    sx={{
                      px: 1,
                      borderRadius: 1,
                      bgcolor: (theme) =>
                        message?.inputMessages
                          ? theme.palette.grey[100]
                          : alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity),
                      position: 'relative',
                    }}>
                    <MdViewer content={message.content} />

                    {message.images && message.images.length > 0 && (
                      <ImagePreviewB64 itemWidth={100} spacing={1} dataSource={message.images} />
                    )}

                    {message.loading && !message.inputMessages && <WritingIndicator />}

                    {message.role === 'assistant' && (
                      <Box className="actions">
                        {message.content && <CopyButton key="copy" message={message.content} />}
                      </Box>
                    )}
                  </MessageViewContent>
                ) : null}

                {message.error ? (
                  <ErrorCard error={message.error} />
                ) : (
                  message.cancelled && (
                    <Alert variant="standard" color="warning" sx={{ display: 'inline-flex', px: 1, py: 0 }}>
                      Cancelled
                    </Alert>
                  )
                )}
              </Box>
            </Box>
          </Stack>
        </Stack>
      </ErrorBoundary>
    );
  }
);

const MessageViewContent = styled(Box)`
  > .actions {
    position: absolute;
    right: 2px;
    top: 2px;
    border-radius: 4px;
    opacity: 0;

    &.active {
      display: flex;
    }

    button {
      min-width: 0;
      padding: 0;
      height: 24px;
      width: 22px;
      color: rgba(0, 0, 0, 0.4);
    }
  }

  &:hover {
    > .actions {
      opacity: 1;
      background-color: rgba(240, 240, 240, 0.9);
    }
  }
`;

function CopyButton({ message }: { message: string }) {
  const [copied, setCopied] = useState<'copied' | boolean>(false);
  const { t } = useLocaleContext();

  return (
    <Tooltip title={copied === 'copied' ? t('copied') : t('copy')} placement="top" open={Boolean(copied)}>
      <Button
        size="small"
        className={cx('copy', copied && 'active')}
        onMouseEnter={() => setCopied(true)}
        onMouseLeave={() => setCopied(false)}
        onClick={() => {
          navigator.clipboard.writeText(message);
          setCopied('copied');
          setTimeout(() => setCopied(false), 1500);
        }}>
        <CopyAll fontSize="small" />
      </Button>
    </Tooltip>
  );
}

function ChatModeForm({
  projectId,
  gitRef,
  assistant,
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
}) {
  const { t } = useLocaleContext();

  const {
    state: { project },
  } = useProjectState(projectId, gitRef);

  const { state, sendMessage, cancelMessage } = useDebugState({ projectId, assistantId: assistant.id });

  const [question, setQuestion] = useState('');

  const currentSession = state.sessions.find((i) => i.index === state.currentSessionIndex);
  const lastMessage = currentSession?.messages.at(-1);

  const submit = () => {
    if (lastMessage?.loading && currentSession) {
      cancelMessage(currentSession.index, lastMessage.id);
      return;
    }

    if (!question.trim()) {
      Toast.error(t('emptyInput'));
      return;
    }

    const promptAssistant = isPromptAssistant(assistant) ? assistant : undefined;

    sendMessage({
      sessionIndex: state.currentSessionIndex!,
      message: {
        type: 'chat',
        content: question,
        model: promptAssistant?.model || project?.model,
        topP: promptAssistant?.topP ?? project?.topP,
        temperature: promptAssistant?.temperature ?? project?.temperature,
        frequencyPenalty: promptAssistant?.frequencyPenalty ?? project?.frequencyPenalty,
        presencePenalty: promptAssistant?.presencePenalty ?? project?.presencePenalty,
      },
    });

    setQuestion('');
  };

  return (
    <Stack component="form" onSubmit={(e) => e.preventDefault()} direction="row" alignItems="center" gap={1}>
      <TextField
        hiddenLabel
        fullWidth
        value={question}
        multiline
        maxRows={10}
        onChange={(e) => setQuestion(e.target.value)}
        onKeyDown={(e) => {
          // NOTE: 中文输入法候选词 Enter 事件（会将当前输入的拼音当作英文字母放到 input 中）
          if (e.keyCode === 229) {
            return;
          }
          if (!e.shiftKey && e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        sx={{ border: '1px solid #E5E7EB', borderRadius: 1 }}
      />

      <Tooltip title={lastMessage?.loading ? t('stop') : t('send')} placement="top">
        <Button
          type="submit"
          variant="contained"
          sx={{
            whiteSpace: 'nowrap',
            background: '#030712',
            color: '#fff',
            '&:hover': {
              background: '#030712',
            },
          }}
          endIcon={
            lastMessage?.loading ? (
              <Stack position="relative" alignItems="center" justifyContent="center" width={20} height={20}>
                <CircularProgress
                  size={20}
                  color="inherit"
                  sx={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, margin: 'auto' }}
                />
                <Record />
              </Stack>
            ) : null
          }>
          {t('send')}
        </Button>
      </Tooltip>
    </Stack>
  );
}

const EXPANDED_NAME = 'EXPANDED_NAME';

function DebugModeForm({
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
  const key = `${projectId}-${gitRef}-${assistant.id}`;

  const {
    session: { user },
  } = useSessionContext();

  const { state, sendMessage, setSession, cancelMessage } = useDebugState({
    projectId,
    assistantId: assistant.id,
  });

  const [expanded, setExpanded] = useLocalStorageState<string | false>(key, { defaultValue: EXPANDED_NAME });
  const isExpanded = expanded === EXPANDED_NAME;

  const handleChange = (panel: string | false) => (_e: SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const currentSession = state.sessions.find((i) => i.index === state.currentSessionIndex);
  const lastMessage = currentSession?.messages.at(-1);

  const parameters = sortBy(Object.values(assistant.parameters ?? {}), (i) => i.index).filter(
    (i): i is typeof i & { data: { key: string } } => !!i.data.key
  );
  const params = parameters.map((i) => i.data.key);

  const initForm = useMemo(
    () =>
      pick(
        cloneDeep(
          currentSession?.debugForm ??
            Object.fromEntries(parameters.map(({ data: parameter }) => [parameter.key, parameter.defaultValue ?? '']))
        ),
        params
      ),
    [currentSession?.debugForm, parameters, assistant.id]
  );

  const form = useForm<{ [key: string]: any }>({ defaultValues: initForm });

  useEffect(() => {
    form.reset(initForm);
  }, [assistant.id]);

  const submit = (parameters: { [key: string]: any }) => {
    parameters = pick(parameters, params);

    if (lastMessage?.loading && currentSession) {
      cancelMessage(currentSession.index, lastMessage.id);
      return;
    }

    if (isPromptAssistant(assistant)) {
      if (assistant?.prompts && !Object.values(assistant?.prompts)?.length) {
        Toast.error(t('emptyPrompts'));
        return;
      }
    }

    sendMessage({
      sessionIndex: state.currentSessionIndex!,
      message: {
        type: 'debug',
        projectId,
        assistantId: assistant.id,
        gitRef,
        parameters: { ...parameters, $clientTime: new Date().toISOString() },
      },
    });
    setSession(state.currentSessionIndex!, (session) => {
      session.debugForm = { ...parameters };
    });
  };

  const addToTest = () => {
    const doc = (getYjsValue(assistant) as Map<any>).doc!;
    doc.transact(() => {
      const id = `${Date.now()}-${nanoid(16)}`;
      const keys = parameters.map((i) => i.data.key);
      const result = pick(form.getValues(), keys);
      assistant.tests ??= {};
      assistant.tests[id] = {
        index: Object.values(assistant.tests).length,
        data: {
          id,
          parameters: result,
          createdBy: user.did,
        },
      };
    });
    setCurrentTab('test');
  };

  return (
    <Stack component="form" onSubmit={form.handleSubmit(submit)} gap={1}>
      {!!parameters.length && (
        <CustomAccordion
          disableGutters
          expanded={isExpanded}
          onChange={handleChange(parameters.length > 1 ? EXPANDED_NAME : false)}
          elevation={0}
          sx={{
            ':before': { display: 'none' },
            p: 0,
            borderRadius: 1,
          }}>
          <AccordionSummary
            sx={{
              px: 2,
              minHeight: (theme) => theme.spacing(3.5),
              [`.${accordionSummaryClasses.content}`]: {
                m: 0,
                py: 0,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
              },
            }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: 1,
              }}>
              <Typography variant="subtitle2" mb={0}>
                {t('parameter')}
              </Typography>

              {parameters.length > 1 && (
                <Box
                  component={Icon}
                  icon="tabler:chevron-down"
                  sx={{
                    fontSize: 20,
                    transform: `rotateZ(${expanded ? '0' : '-180deg'})`,
                    transition: (theme) => theme.transitions.create('all'),
                    color: (theme) => theme.palette.text.disabled,
                  }}
                />
              )}
            </Box>
          </AccordionSummary>

          <AccordionDetails sx={{ p: 0, maxHeight: '50vh', overflow: !isExpanded ? 'hidden' : 'auto' }}>
            <Stack gap={1}>
              {parameters.map(({ data: parameter }) => {
                const { required, min, max, minLength, maxLength } = (parameter as any) ?? {};

                return (
                  <Box key={parameter.id}>
                    <Controller
                      control={form.control}
                      name={parameter.key}
                      rules={{
                        required: required ? t('validation.fieldRequired') : undefined,
                        min:
                          typeof min === 'number'
                            ? { value: min, message: t('validation.fieldMin', { min }) }
                            : undefined,
                        max:
                          typeof max === 'number'
                            ? { value: max, message: t('validation.fieldMax', { max }) }
                            : undefined,
                        minLength:
                          typeof minLength === 'number'
                            ? { value: minLength, message: t('validation.fieldMinLength', { minLength }) }
                            : undefined,
                        maxLength:
                          typeof maxLength === 'number'
                            ? { value: maxLength, message: t('validation.fieldMaxLength', { maxLength }) }
                            : undefined,
                      }}
                      render={({ field, fieldState }) => {
                        return (
                          <ParameterField
                            label={parameter.label || parameter.key}
                            fullWidth
                            parameter={parameterFromYjs(parameter)}
                            maxRows={!parameter?.type || parameter?.type === 'string' ? 5 : undefined}
                            value={field.value || ''}
                            onChange={(value) => field.onChange({ target: { value } })}
                            error={Boolean(fieldState.error)}
                            helperText={fieldState.error?.message || parameter?.helper}
                          />
                        );
                      }}
                    />
                  </Box>
                );
              })}
            </Stack>
          </AccordionDetails>
        </CustomAccordion>
      )}

      <Stack gap={1} direction="row">
        <Button variant="outlined" onClick={addToTest} sx={{ borderColor: '#E5E7EB', color: '#030712' }}>
          {t('addToTest')}
        </Button>

        <Box flex={1} />

        <Button
          type="submit"
          variant="contained"
          sx={{
            background: '#030712',
            color: '#fff',
            '&:hover': {
              background: '#030712',
            },
          }}
          endIcon={
            lastMessage?.loading ? (
              <Stack position="relative" alignItems="center" justifyContent="center" width={20} height={20}>
                <CircularProgress
                  size={20}
                  color="inherit"
                  sx={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, margin: 'auto' }}
                />
                <Record />
              </Stack>
            ) : null
          }>
          {lastMessage?.loading ? t('stop') : t('execute')}
        </Button>
      </Stack>
    </Stack>
  );
}

function EmptySessions({ projectId, templateId }: { projectId: string; templateId: string }) {
  const { newSession } = useDebugState({ projectId, assistantId: templateId });
  const { t } = useLocaleContext();

  return (
    <Stack mt={10} gap={2} alignItems="center">
      <Empty sx={{ fontSize: 54, color: 'grey.300' }} />

      <Button
        startIcon={<Add />}
        onClick={(e) => {
          e.preventDefault();
          newSession();
        }}>
        {t('newObject', { object: t('session') })}
      </Button>
    </Stack>
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

const CustomAccordion = styled(Accordion)(() => ({
  '& .MuiAccordionSummary-root': {
    padding: 0,
  },

  '& .MuiCollapse-root': {
    minHeight: '54px !important',
    visibility: 'visible !important',
  },
}));

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
