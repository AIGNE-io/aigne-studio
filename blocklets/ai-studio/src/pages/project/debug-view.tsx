import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ImagePreview } from '@blocklet/ai-kit';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { css, cx } from '@emotion/css';
import { Add, CopyAll } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alertClasses,
  outlinedInputClasses,
  selectClasses,
  styled,
} from '@mui/material';
import { pick } from 'lodash';
import cloneDeep from 'lodash/cloneDeep';
import omit from 'lodash/omit';
import { nanoid } from 'nanoid';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import ScrollToBottom, { useScrollToBottom } from 'react-scroll-to-bottom';

import { TemplateYjs } from '../../../api/src/store/projects';
import { parameterFieldComponent } from '../../components/parameter-field';
import { useSessionContext } from '../../contexts/session';
import Empty from './icons/empty';
import Trash from './icons/trash';
import PaperPlane from './paper-plane';
import { parseDirectivesOfTemplate } from './prompt-state';
import Record from './record';
import { SessionItem, useDebugState } from './state';

export default function DebugView(props: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
  setCurrentTab: (tab: string) => void;
}) {
  const { state, setCurrentSession } = useDebugState({
    projectId: props.projectId,
    templateId: props.template.id,
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
      {!state.sessions.length && <EmptySessions projectId={props.projectId} templateId={props.template.id} />}
    </Box>
  );
}

function DebugViewContent({
  projectId,
  gitRef,
  template,
  setCurrentTab,
}: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
  setCurrentTab: (tab: string) => void;
}) {
  const { t } = useLocaleContext();

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
          <DebugModeForm projectId={projectId} gitRef={gitRef} template={template} setCurrentTab={setCurrentTab} />
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
            <ToggleButton value="chat">{t('chat')}</ToggleButton>
            <ToggleButton value="debug">{t('debug')}</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Stack>
    </>
  );
}

function SessionSelect({ projectId, templateId }: { projectId: string; templateId: string }) {
  const { t } = useLocaleContext();
  const { state, newSession, deleteSession, setCurrentSession } = useDebugState({ projectId, templateId });

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

function MessageView({ message }: { message: SessionItem['messages'][number] }) {
  return (
    <>
      <Stack px={2} py={1} direction="row" gap={1} position="relative">
        <Box py={0.5}>
          <Avatar sx={{ width: 24, height: 24, fontSize: 14 }}>{message.role.slice(0, 1).toUpperCase()}</Avatar>
        </Box>

        <Box
          flex={1}
          sx={{
            [`.${alertClasses.icon},.${alertClasses.message}`]: { py: '5px' },
          }}>
          {message.content || message.parameters || message.images?.length || message.loading ? (
            <MessageViewContent
              sx={{
                whiteSpace: 'pre-wrap',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                wordBreak: 'break-word',
                ':hover': {
                  bgcolor: 'grey.100',
                },
                position: 'relative',
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
                <ImagePreview
                  itemWidth={100}
                  spacing={1}
                  dataSource={message.images.map(({ url }) => ({ src: url }))}
                />
              )}

              {message.loading && <WritingIndicator />}

              {message.role === 'assistant' && (
                <Box className="actions">{message.content && <CopyButton key="copy" message={message.content} />}</Box>
              )}
            </MessageViewContent>
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

      {message.subMessages && (
        <Box ml={6}>
          {message.subMessages.map((item) => {
            const content = item.templateName ? `${item.templateName} : ${item.content}` : item.content;

            return (
              <Box py={0.5} key={item.templateId} display="flex" alignItems="flex-start">
                <Avatar sx={{ width: 24, height: 24, fontSize: 14 }}>{content.slice(0, 1).toUpperCase()}</Avatar>
                <Box ml={1}>{content}</Box>
              </Box>
            );
          })}
        </Box>
      )}
    </>
  );
}

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

function ChatModeForm({ projectId, templateId }: { projectId: string; templateId: string }) {
  const { t } = useLocaleContext();

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

function DebugModeForm({
  projectId,
  gitRef,
  template,
  setCurrentTab,
}: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
  setCurrentTab: (tab: string) => void;
}) {
  const { t } = useLocaleContext();

  const { state, sendMessage, setSession, cancelMessage } = useDebugState({
    projectId,
    templateId: template.id,
  });

  const currentSession = state.sessions.find((i) => i.index === state.currentSessionIndex);
  const lastMessage = currentSession?.messages.at(-1);

  const scrollToBottom = useScrollToBottom();

  const params = new Set(
    parseDirectivesOfTemplate(template, { excludeCallPromptVariables: true })
      .map((i) => (i.type === 'variable' ? i.name : undefined))
      .filter((i): i is string => Boolean(i))
  );
  if (template.type === 'image') {
    params.add('size');
    params.add('number');
  }
  if (template.mode === 'chat') {
    params.add('question');
  }

  const initForm = useMemo(
    () =>
      pick(
        cloneDeep(
          currentSession?.debugForm ??
            Object.fromEntries(
              Object.entries(template.parameters ?? {}).map(([param, parameter]) => [
                param,
                parameter.defaultValue ??
                  (!parameter.type || ['string', 'select', 'number', 'language'].includes(parameter.type)
                    ? ''
                    : undefined),
              ])
            )
        ),
        ...params
      ),
    [currentSession?.debugForm]
  );

  const form = useForm<{ [key: string]: any }>({ defaultValues: initForm });

  const submit = (form: { [key: string]: any }) => {
    if (lastMessage?.loading && currentSession) {
      cancelMessage(currentSession.index, lastMessage.id);
      return;
    }
    sendMessage({
      sessionIndex: state.currentSessionIndex!,
      message: { type: 'debug', projectId, templateId: template.id, gitRef, parameters: pick(form, ...params) },
    });
    setSession(state.currentSessionIndex!, (session) => {
      session.debugForm = { ...form };
    });
    scrollToBottom({ behavior: 'smooth' });
  };

  const {
    session: { user },
  } = useSessionContext();

  const addToTest = () => {
    const doc = (getYjsValue(template) as Map<any>).doc!;
    doc.transact(() => {
      template.tests ??= {};
      const id = `${Date.now()}-${nanoid(16)}`;
      template.tests[id] = {
        index: Object.values(template.tests).length,
        data: {
          id,
          parameters: form.getValues(),
          createdBy: user.did,
        },
      };
    });
    setCurrentTab('test');
  };

  return (
    <Stack component="form" onSubmit={form.handleSubmit(submit)} px={2} gap={1}>
      <Stack gap={1}>
        {[...params].map((param) => {
          const parameter =
            template.parameters?.[param] ?? (param === 'question' && template.mode === 'chat' ? {} : undefined);

          const Field = parameterFieldComponent({ type: parameter?.type ?? 'string' });

          return (
            <Box key={param}>
              <Controller
                control={form.control}
                name={param}
                render={({ field, fieldState }) => {
                  const { required, min, max, minLength, maxLength } = (parameter as any) ?? {};

                  return (
                    <Field
                      label={parameter?.label || param}
                      fullWidth
                      parameter={omit(parameter, 'min', 'max') as never}
                      maxRows={!parameter?.type || parameter?.type === 'string' ? 5 : undefined}
                      // FIXME: 临时去掉 NumberField 的自动转 number 功能
                      {...(parameter?.type === 'number' ? { autoCorrectValue: false } : undefined)}
                      {...form.register(param, {
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
                      })}
                      value={field.value}
                      onChange={(v) =>
                        form.setValue(param, v, { shouldDirty: true, shouldTouch: true, shouldValidate: true })
                      }
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
  const { newSession } = useDebugState({ projectId, templateId });
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
