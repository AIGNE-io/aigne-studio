import ErrorCard from '@app/components/error-card';
import MdViewer from '@app/components/md-viewer';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { ImagePreview } from '@blocklet/ai-kit/components';
import { ParameterField } from '@blocklet/ai-runtime/components';
import { AssistantYjs, isAssistant, isPromptAssistant, parameterFromYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { css, cx } from '@emotion/css';
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  accordionSummaryClasses,
  alertClasses,
  alpha,
  outlinedInputClasses,
  selectClasses,
  styled,
} from '@mui/material';
import { GridExpandMoreIcon } from '@mui/x-data-grid';
import { useLocalStorageState } from 'ahooks';
import dayjs from 'dayjs';
import { isEmpty, pick, sortBy } from 'lodash';
import cloneDeep from 'lodash/cloneDeep';
import { nanoid } from 'nanoid';
import { ComponentProps, SyntheticEvent, memo, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import ScrollToBottom, { useScrollToBottom } from 'react-scroll-to-bottom';

import { useSessionContext } from '../../contexts/session';
import Broom from './icons/broom';
import ChevronDown from './icons/chevron-down';
import Empty from './icons/empty';
import Record from './icons/record';
import Trash from './icons/trash';
import PaperPlane from './paper-plane';
import { SessionItem, useDebugState, useProjectState } from './state';
import { useProjectStore } from './yjs-state';

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
    <Box
      key={state.currentSessionIndex}
      initialScrollBehavior="auto"
      component={ScrollToBottom}
      flexGrow={1}
      height="100%"
      overflow="auto"
      scrollViewClassName={css`
        display: flex;
        flex-direction: column;
      `}
      followButtonClassName={css`
        display: none;
      `}>
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

  const { state, setSession, clearCurrentSession } = useDebugState({
    projectId,
    assistantId: assistant.id,
  });

  const currentSession = state.sessions.find((i) => i.index === state.currentSessionIndex);

  if (!currentSession) return null;
  return (
    <>
      <Box
        px={4}
        pb={2}
        pt={1}
        display="flex"
        justifyContent="space-between"
        bgcolor="background.paper"
        sx={{ position: 'sticky', top: 0, zIndex: 2 }}>
        <Box maxWidth={200}>
          <SessionSelect projectId={projectId} assistantId={assistant.id} />
        </Box>
        <Tooltip title={t('clearSession')}>
          <IconButton
            size="small"
            sx={{ color: (theme) => alpha(theme.palette.error.light, 0.8) }}
            onClick={clearCurrentSession}>
            <Broom fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box component={ScrollToBottom} initialScrollBehavior="auto" flexGrow={1} sx={{ overflowX: 'hidden' }}>
        {currentSession.messages.map((message) => (
          <MessageView
            currentSession={currentSession.chatType}
            key={message.id}
            projectId={projectId}
            gitRef={gitRef}
            message={message}
          />
        ))}
      </Box>

      <Stack gap={2} sx={{ position: 'sticky', bottom: 0, py: 2, bgcolor: 'background.paper' }}>
        {currentSession.chatType !== 'debug' ? (
          <ChatModeForm projectId={projectId} gitRef={gitRef} assistant={assistant} />
        ) : (
          <DebugModeForm projectId={projectId} gitRef={gitRef} assistant={assistant} setCurrentTab={setCurrentTab} />
        )}

        <Box textAlign="center">
          <ToggleButtonGroup
            exclusive
            value={currentSession.chatType ?? 'chat'}
            sx={{ button: { py: 0.25 } }}
            onChange={(_, v) =>
              setSession(currentSession.index, (session) => {
                session.chatType = v;
              })
            }>
            <ToggleButton value="debug">{t('debug')}</ToggleButton>
            <ToggleButton value="chat">{t('chat')}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Stack>
    </>
  );
}

function SessionSelect({ projectId, assistantId }: { projectId: string; assistantId: string }) {
  const { t } = useLocaleContext();
  const { state, newSession, deleteSession, setCurrentSession } = useDebugState({
    projectId,
    assistantId,
  });

  return (
    <Select
      variant="outlined"
      value={state.currentSessionIndex}
      placeholder={t('newObject', { object: t('session') })}
      fullWidth
      sx={{
        [`.${selectClasses.select}`]: {
          py: 0.5,
        },
        [`.${outlinedInputClasses.notchedOutline}`]: {
          borderRadius: 100,
        },
      }}
      renderValue={(value) => `${t('session')} ${value}`}
      onChange={(e) => setCurrentSession(e.target.value as number)}>
      {state.sessions.map((session) => (
        <MenuItem key={session.index} value={session.index}>
          <Typography flex={1}>
            {t('session')} {session.index}
          </Typography>

          <Button
            sx={{ minWidth: 0, p: 0.25 }}
            onClick={(e) => {
              e.stopPropagation();
              deleteSession(session.index);
            }}>
            <Trash sx={{ fontSize: 14, color: 'text.secondary' }} />
          </Button>
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
    projectId,
    gitRef,
    currentSession,
    message,
  }: {
    projectId: string;
    currentSession?: 'chat' | 'debug';
    gitRef: string;
    message: SessionItem['messages'][number];
  }) => {
    const { t } = useLocaleContext();
    const { store } = useProjectStore(projectId, gitRef);
    return (
      <>
        <Stack px={2} py={1} direction="row" gap={1} position="relative">
          <Box py={0.5}>
            <Avatar sx={{ width: 24, height: 24, fontSize: 14 }}>{message.role.slice(0, 1).toUpperCase()}</Avatar>
          </Box>
          <Box width="100%">
            {!!message.logs?.length && (
              <Box mb={1} bgcolor="grey.50" borderRadius={1} p={1}>
                {message.logs.map((item, index) => (
                  <Box my={0.5} key={index}>
                    <Typography component="span" color="text.secondary">
                      {`${dayjs(item.timestamp).format('HH:mm:ss:SSS')}: `}
                    </Typography>
                    <Typography ml={0.25} component="span">{`${item.log}  `}</Typography>
                  </Box>
                ))}
              </Box>
            )}
            <Box
              flex={1}
              sx={{
                [`.${alertClasses.icon},.${alertClasses.message}`]: { py: '5px' },
              }}>
              {message.content || message.parameters || message.images?.length || message.loading ? (
                <MessageViewContent
                  sx={{
                    px: 1,
                    py: 1,
                    borderRadius: 1,
                    bgcolor: (theme) =>
                      message?.inputMessages
                        ? theme.palette.grey[100]
                        : alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity),
                    position: 'relative',
                  }}>
                  {<MdViewer content={message.content} /> ||
                    (message.parameters && (
                      <Box>
                        {!isEmpty(message.parameters) ? (
                          Object.entries(message.parameters).map(([key, val]) => (
                            <Typography key={key}>
                              <Typography component="span" color="text.secondary">
                                {key}
                              </Typography>
                              : {typeof val === 'string' ? val : JSON.stringify(val)}
                            </Typography>
                          ))
                        ) : (
                          <span>{t('noParameters')}</span>
                        )}
                      </Box>
                    ))}
                  {!!message.inputMessages?.messages?.length && (
                    <Box margin={0.5}>
                      {message.inputMessages?.messages.map((i, index) => (
                        <Accordion
                          sx={{
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                            '&:not(:last-child)': {
                              borderBottom: 0,
                            },
                            '&::before': {
                              display: 'none',
                            },
                          }}
                          disableGutters
                          elevation={0}
                          key={index}>
                          <AccordionSummary
                            sx={{
                              backgroundColor: (theme) =>
                                theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, .05)' : 'rgba(0, 0, 0, .03)',
                              minHeight: 28,
                              '& .MuiAccordionSummary-content': {
                                my: 0,
                              },
                            }}
                            expandIcon={<GridExpandMoreIcon />}>
                            <Typography>{i.role}</Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ fontSize: 18, py: 1 }}>
                            <Typography>{i.content}</Typography>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </Box>
                  )}

                  {message.images && message.images.length > 0 && (
                    <ImagePreviewB64 itemWidth={100} spacing={1} dataSource={message.images} />
                  )}

                  {message.loading &&
                    (message.inputMessages ? (
                      message?.inputMessages?.messages.length === 0 &&
                      (currentSession === 'debug' ? <CircularProgress sx={{ marginTop: 1 }} size={18} /> : null)
                    ) : (
                      <WritingIndicator />
                    ))}

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

        {message.subMessages && (
          <Box ml={6}>
            {message.subMessages.map((item) => {
              const assistant = store.files[item.assistantId];
              const name = (assistant && isAssistant(assistant) && assistant.name) || item.taskId;

              const avatar = (
                <Avatar sx={{ width: 24, height: 24, fontSize: 14 }}>{name?.slice(0, 1).toUpperCase()}</Avatar>
              );

              return (
                <Box key={item.taskId}>
                  <Box py={1} display="flex" alignItems="center" gap={1}>
                    {avatar}
                    <Box>{name}</Box>
                  </Box>

                  <Box ml={4}>
                    {item.content && (
                      <Box
                        component="pre"
                        sx={{ whiteSpace: 'pre-wrap', background: 'rgba(0, 0, 0, 0.03)', color: '#000', mr: 2 }}
                        dangerouslySetInnerHTML={{ __html: item.content }}
                      />
                    )}

                    {item.images && item.images.length > 0 && (
                      <ImagePreviewB64 itemWidth={100} spacing={1} dataSource={item.images} />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </>
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

  const scrollToBottom = useScrollToBottom();

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
    scrollToBottom({ behavior: 'smooth' });

    setQuestion('');
  };

  return (
    <Stack component="form" onSubmit={(e) => e.preventDefault()} direction="row" alignItems="flex-end" px={2} gap={1}>
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
      />

      <Tooltip title={lastMessage?.loading ? t('stop') : t('send')} placement="top">
        <Button
          type="submit"
          sx={{
            minWidth: 0,
            width: 32,
            height: 32,
            p: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
          onClick={submit}>
          {lastMessage?.loading ? (
            <>
              <CircularProgress
                size={24}
                sx={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, margin: 'auto' }}
              />
              <Record />
            </>
          ) : (
            <PaperPlane />
          )}
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

  const scrollToBottom = useScrollToBottom();

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
    [currentSession?.debugForm, parameters]
  );

  const form = useForm<{ [key: string]: any }>({ defaultValues: initForm });

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
      message: { type: 'debug', projectId, assistantId: assistant.id, gitRef, parameters },
    });
    setSession(state.currentSessionIndex!, (session) => {
      session.debugForm = { ...parameters };
    });
    scrollToBottom({ behavior: 'smooth' });
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
    <Stack component="form" onSubmit={form.handleSubmit(submit)} px={2} gap={1}>
      {!!parameters.length && (
        <CustomAccordion
          disableGutters
          expanded={isExpanded}
          onChange={handleChange(parameters.length > 1 ? EXPANDED_NAME : false)}
          elevation={0}
          sx={{
            ':before': { display: 'none' },
            position: 'sticky',
            bottom: 0,
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
              <Box
                sx={{
                  fontSize: (theme) => theme.typography.caption.fontSize,
                  color: (theme) => theme.palette.text.disabled,
                }}>
                {t('parameter')}
              </Box>

              {parameters.length > 1 && (
                <ChevronDown
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

          <AccordionDetails sx={{ py: 1, px: 0, maxHeight: '50vh', overflow: !isExpanded ? 'hidden' : 'auto' }}>
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
        <Button variant="outlined" onClick={addToTest}>
          {t('addToTest')}
        </Button>

        <Box flex={1} />

        <Button
          type="submit"
          variant="contained"
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
            ) : (
              <PaperPlane />
            )
          }>
          {lastMessage?.loading ? t('stop') : t('send')}
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

function ImagePreviewB64({
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
