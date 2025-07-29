import { Divider, Stack, StackProps } from '@mui/material';
import pick from 'lodash/pick';
import React from 'react';

import { AgentErrorView } from '../../components/AgentErrorBoundary';
import { useComponentPreferences } from '../../contexts/ComponentPreferences';
import { useSession } from '../../contexts/Session';
import mapRight from '../../utils/map-right';
import MessageView from './MessageView';
import OpeningMessageView from './OpeningMessageView';
import type { SimpleChatPreferences } from '.';

export default function MessagesView({ ...props }: StackProps) {
  const {
    error,
    sessionId,
    messages = [],
    loaded,
  } = useSession((s) => pick(s, 'error', 'sessionId', 'messages', 'loaded'));
  const divider = useComponentPreferences<SimpleChatPreferences>()?.divider;

  const showOpeningMessage = !sessionId || loaded;

  return (
    <Stack
      {...props}
      sx={[
        {
          gap: 2,
        },
        ...(Array.isArray(props.sx) ? props.sx : [props.sx]),
      ]}>
      {showOpeningMessage && <OpeningMessageView />}
      {mapRight(messages, (message, index) => (
        <React.Fragment key={message.id}>
          <MessageView message={message} />

          {divider && index !== messages.length - 1 ? <Divider sx={{ my: 2 }} /> : undefined}
        </React.Fragment>
      ))}
      {error && <AgentErrorView error={error} />}
    </Stack>
  );
}
