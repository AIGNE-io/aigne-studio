import { ImagePreview } from '@blocklet/ai-kit';
import { css } from '@emotion/css';
import { DeleteOutlineRounded, PlayCircleRounded, SendRounded, StopCircleRounded } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Input,
  MenuItem,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alertClasses,
  outlinedInputClasses,
  selectClasses,
  styled,
} from '@mui/material';
import { useReactive } from 'ahooks';
import { cloneDeep } from 'lodash';
import { useEffect, useMemo, useState } from 'react';
import ScrollToBottom, { useScrollToBottom } from 'react-scroll-to-bottom';

import { TemplateYjs } from '../../../api/src/store/projects';
import ParameterField from '../../components/parameter-field';
import { matchParams } from '../../components/template-form/parameters';
import { SessionItem, useDebugState } from './state';

export default function DebugView(props: { projectId: string; gitRef: string; template: TemplateYjs }) {
  const { state, newSession, setCurrentSession } = useDebugState({
    projectId: props.projectId,
    templateId: props.template.id,
  });

  useEffect(() => {
    if (!state.sessions.length) {
      newSession();
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
    </Box>
  );
}

function DebugViewContent({
  projectId,
  gitRef,
  template,
}: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
}) {
  const { state, setSession } = useDebugState({
    projectId,
    templateId: template.id,
  });

  const currentSession = state.sessions.find((i) => i.index === state.currentSessionIndex);

  if (!currentSession) return null;

  return (
    <>
      <Box px={4} py={2} bgcolor="background.paper" sx={{ position: 'sticky', top: 0, zIndex: 2 }}>
        <Box mx="auto" maxWidth={200}>
          <SessionSelect projectId={projectId} templateId={template.id} />
        </Box>
      </Box>

      <Box flexGrow={1}>
        {currentSession.messages.map((message) => (
          <MessageView key={message.id} message={message} />
        ))}
      </Box>

      <Stack gap={2} sx={{ position: 'sticky', bottom: 0, py: 2, bgcolor: 'background.paper' }}>
        {currentSession.chatType !== 'debug' ? (
          <ChatModeForm projectId={projectId} templateId={template.id} />
        ) : (
          <DebugModeForm projectId={projectId} gitRef={gitRef} template={template} />
        )}

        <Box textAlign="center">
          <ToggleButtonGroup
            exclusive
            value={currentSession.chatType ?? 'chat'}
            size="small"
            sx={{ button: { py: 0.25 } }}
            onChange={(_, v) =>
              setSession(currentSession.index, (session) => {
                session.chatType = v;
              })
            }>
            <ToggleButton value="chat">Text</ToggleButton>
            <ToggleButton value="debug">Prompt</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Stack>
    </>
  );
}

function SessionSelect({ projectId, templateId }: { projectId: string; templateId: string }) {
  const { state, newSession, deleteSession, setCurrentSession } = useDebugState({ projectId, templateId });

  return (
    <Select
      value={state.currentSessionIndex}
      MenuProps={{ elevation: 1 }}
      size="small"
      placeholder="New Session"
      fullWidth
      sx={{
        [`.${selectClasses.select}`]: {
          py: 0.5,
        },
        [`.${outlinedInputClasses.notchedOutline}`]: {
          borderRadius: 100,
        },
      }}
      renderValue={(value) => `Session ${value}`}
      onChange={(e) => setCurrentSession(e.target.value as number)}>
      {state.sessions.map((session) => (
        <MenuItem key={session.index} value={session.index}>
          <Typography flex={1}>Session {session.index}</Typography>

          <Button
            sx={{ minWidth: 0, p: 0.25 }}
            onClick={(e) => {
              e.stopPropagation();
              deleteSession(session.index);
            }}>
            <DeleteOutlineRounded sx={{ fontSize: 14, color: 'text.secondary' }} />
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
        New Session
      </MenuItem>
    </Select>
  );
}

function MessageView({ message }: { message: SessionItem['messages'][number] }) {
  return (
    <Stack p={2} direction="row" gap={1} position="relative">
      <Box py={0.5}>
        <Avatar sx={{ width: 24, height: 24, fontSize: 14 }}>{message.role.slice(0, 1).toUpperCase()}</Avatar>
      </Box>

      <Box
        flex={1}
        sx={{
          [`.${alertClasses.icon},.${alertClasses.message}`]: { py: '5px' },
        }}>
        {message.content || message.parameters || message.images?.length || message.loading ? (
          <Box
            sx={{
              whiteSpace: 'pre-wrap',
              px: 1,
              py: 0.5,
              borderRadius: 1,
              wordBreak: 'break-word',
              ':hover': {
                bgcolor: 'grey.100',
              },
            }}>
            {message.content ||
              (message.parameters && (
                <Box>
                  {Object.entries(message.parameters).map(([key, val]) => (
                    <Typography key={key}>
                      <Typography component="span" color="text.secondary">
                        {key}
                      </Typography>
                      : {val}
                    </Typography>
                  ))}
                </Box>
              ))}

            {message.images && message.images.length > 0 && (
              <ImagePreview itemWidth={100} spacing={1} dataSource={message.images.map(({ url }) => ({ src: url }))} />
            )}

            {message.loading && <WritingIndicator />}
          </Box>
        ) : null}

        {message.error ? (
          <Alert variant="standard" color="error" sx={{ display: 'inline-flex', px: 1, py: 0 }}>
            {message.error.message}
          </Alert>
        ) : (
          message.cancelled && (
            <Alert variant="standard" color="warning" sx={{ display: 'inline-flex', px: 1, py: 0 }}>
              Cancelled
            </Alert>
          )
        )}
      </Box>
    </Stack>
  );
}

const StyledInput = styled(Input)`
  border-radius: ${({ theme }) => theme.shape.borderRadius * 2}px;
  padding-left: ${({ theme }) => theme.spacing(1)};
  padding-right: ${({ theme }) => theme.spacing(1)};
  background-color: ${({ theme }) => theme.palette.grey[100]};
`;

function ChatModeForm({ projectId, templateId }: { projectId: string; templateId: string }) {
  const { state, sendMessage, cancelMessage } = useDebugState({ projectId, templateId });

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
      return;
    }

    sendMessage({ sessionIndex: state.currentSessionIndex!, message: { type: 'chat', content: question } });
    scrollToBottom({ behavior: 'smooth' });

    setQuestion('');
  };

  return (
    <Stack component="form" onSubmit={(e) => e.preventDefault()} direction="row" alignItems="flex-end" px={2} gap={1}>
      <StyledInput
        disableUnderline
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

      <Tooltip title={lastMessage?.loading ? 'Stop' : 'Send'} placement="top">
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
              <StopCircleRounded fontSize="small" />
            </>
          ) : (
            <SendRounded />
          )}
        </Button>
      </Tooltip>
    </Stack>
  );
}

function DebugModeForm({ projectId, gitRef, template }: { projectId: string; gitRef: string; template: TemplateYjs }) {
  const { state, sendMessage, setSession, cancelMessage } = useDebugState({
    projectId,
    templateId: template.id,
  });

  const currentSession = state.sessions.find((i) => i.index === state.currentSessionIndex);
  const lastMessage = currentSession?.messages.at(-1);

  const scrollToBottom = useScrollToBottom();

  const initForm = useMemo(() => cloneDeep(currentSession?.debugForm ?? {}), [currentSession?.debugForm]);

  const form = useReactive<{ [key: string]: any }>(initForm);

  const submit = () => {
    if (lastMessage?.loading && currentSession) {
      cancelMessage(currentSession.index, lastMessage.id);
      return;
    }

    sendMessage({
      sessionIndex: state.currentSessionIndex!,
      message: { type: 'debug', projectId, templateId: template.id, gitRef, parameters: { ...form } },
    });
    setSession(state.currentSessionIndex!, (session) => {
      session.debugForm = { ...form };
    });
    scrollToBottom({ behavior: 'smooth' });
  };

  const params = (() => {
    const params = Object.values(template.prompts ?? {})?.flatMap((i) => matchParams(i.data.content ?? '')) ?? [];
    if (template.type === 'branch') {
      params.push('question');
    }
    if (template.type === 'image') {
      params.push('size');
      params.push('number');
    }
    if (template.mode === 'chat') params.push('question');
    return [...new Set(params)];
  })();

  return (
    <Stack component="form" onSubmit={(e) => e.preventDefault()} px={2} gap={1}>
      <Stack gap={1}>
        {params.map((param) => {
          const parameter =
            template.parameters?.[param] ?? (param === 'question' && template.mode === 'chat' ? {} : undefined);
          if (!parameter) {
            return null;
          }

          return (
            <Box key={param}>
              <ParameterField
                label={parameter.label || param}
                size="small"
                fullWidth
                sx={{
                  bgcolor: 'grey.100',
                  borderRadius: 2,

                  [`.${outlinedInputClasses.notchedOutline}`]: {
                    pl: 1,
                    pr: 1,
                    border: 'none',
                  },
                }}
                parameter={parameter}
                value={form[param] ?? ''}
                onChange={(v) => (form[param] = v)}
              />
            </Box>
          );
        })}
      </Stack>

      <Stack gap={1} direction="row">
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
                <StopCircleRounded sx={{ fontSize: 16 }} />
              </Stack>
            ) : (
              <PlayCircleRounded />
            )
          }
          onClick={submit}>
          {lastMessage?.loading ? 'Stop' : 'Execute'}
        </Button>
      </Stack>
    </Stack>
  );
}

const WritingIndicator = styled('span')`
  &:after {
    content: '';
    display: inline-block;
    vertical-align: middle;
    height: 1.2em;
    margin-top: -0.2em;
    margin-left: 0.1em;
    border-right: 0.2em solid orange;
    border-radius: 10px;
    animation: blink-caret 0.75s step-end infinite;

    @keyframes blink-caret {
      from,
      to {
        border-color: transparent;
      }
      50% {
        border-color: orange;
      }
    }
  }
`;
