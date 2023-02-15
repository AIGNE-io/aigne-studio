import Dashboard from '@blocklet/ui-react/lib/Dashboard';
import styled from '@emotion/styled';
import { Box, Divider } from '@mui/material';
import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import Conversation, { ConversationRef } from '../../components/conversation';
import TemplateForm, { Template, matchParams } from '../../components/template-form';

export default function TemplateView() {
  const [, setSearchParams] = useSearchParams();
  const conversation = useRef<ConversationRef>(null);

  const onExecute = (template: Template) => {
    let prompt = template.template;

    const params = matchParams(template.template);

    for (const param of params) {
      prompt = prompt.replace(new RegExp(`{{\\s*(${param})\\s*}}`, 'g'), template.parameters[param]?.value || '');
    }
    conversation.current?.addConversation(prompt, template);
  };

  return (
    <Root footerProps={{ className: 'dashboard-footer' }}>
      <Conversation
        className="conversation"
        ref={conversation}
        sx={{ flex: 1 }}
        onTemplateClick={(template) => {
          setSearchParams((prev) => {
            if (prev.get('templateId') !== template._id) prev.set('templateId', template._id);
            return prev;
          });
        }}
      />

      <Divider orientation="vertical" />

      <Box className="form" flex={1} p={2} overflow="auto">
        <TemplateForm onExecute={onExecute} />
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
