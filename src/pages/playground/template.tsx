import { Conversation, ConversationRef, MessageItem, useConversation } from '@blocklet/ai-kit';
import Dashboard from '@blocklet/ui-react/lib/Dashboard';
import styled from '@emotion/styled';
import { HighlightOff, Start } from '@mui/icons-material';
import { Box, Button, Divider, Tooltip } from '@mui/material';
import { ReactNode, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Template } from '../../../api/src/store/templates';
import { parameterToStringValue } from '../../components/parameter-field';
import TemplateFormView, { TemplateForm } from '../../components/template-form';
import { ImageGenerationSize, imageGenerations, textCompletions } from '../../libs/ai';
import { getTemplate } from '../../libs/templates';

export default function TemplateView() {
  const ref = useRef<ConversationRef>(null);

  const { messages, add, cancel } = useConversation({
    scrollToBottom: (o) => ref.current?.scrollToBottom(o),
    textCompletions: (prompt, { meta: template }: { meta?: TemplateForm }) => {
      const questionParam = template?.parameters?.question;
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
    const question = template.parameters?.question?.value;

    let next: Template | TemplateForm | undefined = template;

    while (next) {
      const template = next;
      next = undefined;

      if (template.type === 'branch') {
        const branches = template.branch?.branches.filter((i) => i.template?.name);
        if (!branches || !question) {
          return;
        }
        const { text } = await add(
          `\
你是一个分支选择器，你需要根据用户输入的问题选择最合适的一个分支。可用的分支如下：

${branches.map((i) => `${i.template!.name}: ${i.description || ''}`).join('\n')}

Use the following format:

Question: the input question you must think about
Thought: you should always consider which branch is more suitable
Branch: the branch to take, should be one of [${branches.map((i) => i.template!.name).join('\n')}]

Begin!"

Question: ${question}\
`,
          template
        );
        const branchName = text && /Branch: (.*)/s.exec(text)?.[1]?.trim();
        const branchId =
          branchName && template.branch?.branches.find((i) => i.template?.name === branchName)?.template?.id;
        if (branchId) {
          next = await getTemplate(branchId);
        }
      } else {
        let prompt = template.template;
        if (prompt) {
          for (const [param, value] of Object.entries(template.parameters ?? {})) {
            prompt = prompt.replace(new RegExp(`{{\\s*(${param})\\s*}}`, 'g'), parameterToStringValue(value));
          }

          add(prompt, template);
        }
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
