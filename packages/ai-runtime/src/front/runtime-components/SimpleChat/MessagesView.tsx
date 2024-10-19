import { Divider, Stack, StackProps } from '@mui/material';
import pick from 'lodash/pick';
import React from 'react';

import { useComponentPreferences } from '../../contexts/ComponentPreferences';
import { useSession } from '../../contexts/Session';
import mapRight from '../../utils/map-right';
import MessageView from './MessageView';
import OpeningMessageView from './OpeningMessageView';
import type { SimpleChatPreferences } from '.';

export default function MessagesView({ ...props }: StackProps) {
  const { sessionId, messages = [], loaded } = useSession((s) => pick(s, 'sessionId', 'messages', 'loaded'));
  const divider = useComponentPreferences<SimpleChatPreferences>()?.divider;

  const showOpeningMessage = !sessionId || loaded;

  return (
    <Stack gap={2} {...props}>
      {showOpeningMessage && <OpeningMessageView />}

      {mapRight(messages, (message, index) => (
        <React.Fragment key={message.id}>
          <MessageView message={message} />

          {divider && index !== messages.length - 1 ? <Divider sx={{ my: 2 }} /> : undefined}
        </React.Fragment>
      ))}
    </Stack>
  );
}
