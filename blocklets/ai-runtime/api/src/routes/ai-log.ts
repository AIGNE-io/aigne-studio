import { AssistantResponseType, ExecutionPhase, RunAssistantResponse } from '@blocklet/ai-runtime/types';
import { pick } from 'lodash';
import { nanoid } from 'nanoid';

import { Message } from '../libs/log';

export const createLogs = (message: {
  content?: string;
  type?: 'chat' | 'debug';
  gitRef?: string;
  parameters?: { [key: string]: any };
}) => {
  const now = new Date();
  const messageId = `${now.getTime()}-${nanoid(16)}`;
  const responseId = `${messageId}-${1}`;

  const logs: Message[] = [
    {
      id: messageId,
      createdAt: now.toISOString(),
      role: 'user',
      content: message.type === 'chat' ? message.content || '' : '',
      gitRef: message.type === 'debug' ? message.gitRef : undefined,
      parameters: message.type === 'debug' ? message.parameters : undefined,
      inputMessages: [],
      loading: false,
    },
    {
      id: responseId,
      createdAt: now.toISOString(),
      role: 'assistant',
      content: '',
      loading: true,
    },
  ];

  return { logs, messageId, responseId };
};

export const mergeLogs = ({
  logs,
  messageId,
  responseId,
}: {
  logs: Message[];
  messageId: string;
  responseId: string;
}) => {
  const setMessage = (messageId: string, callback: (message: Message) => void) => {
    const message = logs.find((i) => i.id === messageId);
    if (message) {
      callback(message);
    }
  };

  let response = '';
  const messages: Message['messages'] = [];
  const messageMap: { [key: string]: (typeof messages)[number] } = {};
  let mainTaskId: string | undefined;

  return (value: Uint8Array<ArrayBufferLike> | RunAssistantResponse | undefined) => {
    if (value) {
      if (value instanceof Uint8Array) {
        response += '';
      } else if (typeof value === 'string') {
        response += value;
      } else if (value.type === AssistantResponseType.INPUT_PARAMETER) {
        setMessage(messageId, (message) => {
          message.content = value.delta.content || '';
          message.loading = false;
        });
      } else if (value.type === AssistantResponseType.INPUT) {
        setMessage(responseId, (message) => {
          message.inputMessages ??= [];

          let lastInput = message.inputMessages.findLast((input) => input.taskId === value.taskId);
          if (lastInput) {
            lastInput = Object.assign(lastInput, value);
          } else {
            const parentTrace = message?.inputMessages.findLast((i) => i.taskId === value.parentTaskId);
            message.inputMessages.push({ ...value, deep: parentTrace ? (parentTrace?.deep || 0) + 1 : 0 });
          }
        });
      } else if (value.type === AssistantResponseType.CHUNK) {
        const { images } = value.delta;

        if (!mainTaskId) mainTaskId = value.taskId;

        if (value.taskId === mainTaskId) {
          response += value.delta.content || '';

          if (value.delta.object) {
            setMessage(responseId, (message) => {
              if (message.cancelled) return;
              message.objects ??= [];
              message.objects.push(value.delta.object);
            });
          }

          if (images?.length) {
            setMessage(responseId, (message) => {
              if (message.cancelled) return;
              message.images ??= [];
              message.images.push(...images);
            });
          }
        } else {
          if (value.respondAs && value.respondAs !== 'none') {
            let msg = messageMap[value.taskId];
            if (!msg) {
              msg = { taskId: value.taskId, responseAs: value.respondAs };
              messageMap[value.taskId] = msg;
              messages.push(msg);
            }

            msg.content = (msg.content || '') + (value.delta.content || '');
            if (value.delta.images?.length) msg.images = (msg.images || []).concat(value.delta.images);

            setMessage(responseId, (message) => {
              if (message.cancelled) return;
              message.messages = JSON.parse(JSON.stringify(messages));
            });
          }

          setMessage(responseId, (message) => {
            if (message.cancelled) return;

            const lastInput = message.inputMessages?.findLast((input) => input.taskId === value.taskId);
            if (lastInput) {
              if (value.delta.content) {
                lastInput.output ??= '';
                lastInput.output += value.delta.content || '';
              }
              if (value.delta.object) {
                lastInput.output = JSON.stringify(value.delta.object, null, 2);
              }
              if (images?.length) {
                lastInput.images ??= [];
                lastInput.images.push(...images);
              }
            }
          });
        }
      } else if (value.type === AssistantResponseType.EXECUTE) {
        setMessage(responseId, (message) => {
          message.inputMessages ??= [];

          const lastInput = message.inputMessages?.findLast((input) => input.taskId === value.taskId);
          if (value.execution.currentPhase === ExecutionPhase.EXECUTE_ASSISTANT_START) {
            if (!lastInput) {
              const parentTrace = message?.inputMessages.findLast((i) => i.taskId === value.parentTaskId);
              message.inputMessages.push({
                type: AssistantResponseType.INPUT,
                assistantId: value.assistantId,
                assistantName: value.assistantName!,
                taskId: value.taskId,
                parentTaskId: value.parentTaskId,
                startTime: Date.now(),
                deep: parentTrace ? (parentTrace?.deep || 0) + 1 : 0,
              });
            }
          } else if (value.execution.currentPhase === ExecutionPhase.EXECUTE_ASSISTANT_END) {
            if (lastInput) {
              lastInput.endTime = Date.now();
            }
          } else if (value.execution.currentPhase === ExecutionPhase.EXECUTE_SELECT_STOP) {
            if (lastInput) {
              lastInput.endTime = Date.now();
              lastInput.stop = true;
            }
          }
        });
      } else if (value.type === AssistantResponseType.USAGE) {
        setMessage(responseId, (message) => {
          if (message.cancelled) return;
          const lastInput = message.inputMessages?.findLast((input) => input.taskId === value.taskId);
          if (lastInput) lastInput.usage = value.usage;
        });
      } else if (value.type === AssistantResponseType.ERROR) {
        setMessage(responseId, (message) => {
          if (message.cancelled) return;
          message.error = pick(value.error, 'message', 'type', 'timestamp') as {
            message: string;
            [key: string]: unknown;
          };
        });
      } else if (value.type === AssistantResponseType.LOG) {
        setMessage(responseId, (message) => {
          if (message.cancelled) return;
          const lastInput = message.inputMessages?.findLast((input) => input.taskId === value.taskId);
          if (lastInput) {
            lastInput.logs ??= [];
            lastInput.logs.push(value);
          }
        });
      } else if (value.type === AssistantResponseType.PROGRESS) {
        // @ts-ignore
      } else {
        console.error('Unknown AI response type', value);
      }

      setMessage(responseId, (message) => {
        if (message.cancelled) return;
        message.content = response;
      });
    }
  };
};
