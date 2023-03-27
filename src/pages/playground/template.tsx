import { Conversation, ConversationRef, MessageItem, useConversation } from '@blocklet/ai-kit';
import Dashboard from '@blocklet/ui-react/lib/Dashboard';
import styled from '@emotion/styled';
import { HighlightOff, Start } from '@mui/icons-material';
import { Box, Button, Divider, Tooltip } from '@mui/material';
import { ReactNode, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { parameterToStringValue } from '../../components/parameter-field';
import TemplateFormView, { TemplateForm } from '../../components/template-form';
import { ImageGenerationSize, imageGenerations, textCompletions } from '../../libs/ai';

export default function TemplateView() {
  const ref = useRef<ConversationRef>(null);

  const { messages, add, cancel } = useConversation({
    scrollToBottom: (o) => ref.current?.scrollToBottom(o),
    textCompletions: (prompt, { meta: template }: { meta?: TemplateForm }) => {
      const questionParam = template?.parameters.question;
      const question = questionParam && parameterToStringValue(questionParam);

      return textCompletions({
        ...(question
          ? {
              messages: [
                { role: 'system', content: prompt },
                { role: 'user', content: question },
              ],
            }
          : { prompt }),
        stream: true,
      });
    },
    imageGenerations: (prompt) =>
      imageGenerations({ ...prompt, size: prompt.size as ImageGenerationSize, response_format: 'b64_json' }).then(
        (res) => res.data.map((i) => ({ url: `data:image/png;base64,${i.b64_json}` }))
      ),
  });

  const [, setSearchParams] = useSearchParams();

  const onExecute = async (template: TemplateForm) => {
    let prompt: string | undefined = template.template;

    while (prompt) {
      for (const [param, value] of Object.entries(template.parameters)) {
        prompt = prompt.replace(new RegExp(`{{\\s*(${param})\\s*}}`, 'g'), parameterToStringValue(value));
      }

      const text: string | undefined = (await add(prompt, template)).text?.trim();
      if (text) {
        prompt = template.templates?.find((i) => i.name === text)?.template;
      }
    }
  };

  const customActions = useCallback(
    (msg: MessageItem): [ReactNode[], ReactNode[]] => {
      return [
        [],
        [
          msg.meta?._id && (
            <Tooltip key="template" title="Use current template" placement="top">
              <Button
                size="small"
                onClick={() => {
                  setSearchParams((prev) => {
                    if (prev.get('templateId') !== msg.meta._id) prev.set('templateId', msg.meta._id);
                    return prev;
                  });
                }}>
                <Start fontSize="small" />
              </Button>
            </Tooltip>
          ),
          msg.loading && (
            <Tooltip key="stop" title="Stop" placement="top">
              <Button size="small" onClick={() => cancel(msg)}>
                <HighlightOff fontSize="small" />
              </Button>
            </Tooltip>
          ),
        ],
      ];
    },
    [cancel, setSearchParams]
  );

  return (
    <Root footerProps={{ className: 'dashboard-footer' }}>
      <Conversation
        className="conversation"
        ref={ref}
        sx={{ flex: 1 }}
        messages={messages}
        onSubmit={(prompt) => add(prompt)}
        customActions={customActions}
      />

      <Divider orientation="vertical" />

      <Box className="form" flex={1} p={2} overflow="auto">
        <TemplateFormView onExecute={onExecute} />
      </Box>
    </Root>
  );
}

const Root = styled(Dashboard)`
  > .dashboard-body > .dashboard-main {
    > .dashboard-content {
      display: flex;
      padding-left: 0;
      padding-right: 0;
      overflow: hidden;

      @media (max-width: 900px) {
        flex-direction: column-reverse;
        overflow: auto;

        > .conversation {
          overflow: unset;
        }

        > .MuiDivider-root {
          height: 1px;
          width: 100%;
          margin: 32px 0;
          border-bottom: 1px solid #eee;
        }

        > .form {
          flex: unset;
          overflow: unset;
        }
      }
    }

    > .dashboard-footer {
      margin-top: 0;
      padding: 0;
    }
  }
`;
