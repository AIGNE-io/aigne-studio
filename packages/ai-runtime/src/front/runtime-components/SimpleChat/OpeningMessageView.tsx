import { memo, useMemo } from 'react';

import { RuntimeOutputVariable } from '../../../types';
import { getAssetUrl } from '../../api/asset';
import CustomComponentRenderer from '../../components/CustomComponentRenderer/CustomComponentRenderer';
import UserInfo from '../../components/UserInfo';
import { DEFAULT_OUTPUT_COMPONENTS } from '../../constants';
import { useAgent } from '../../contexts/Agent';
import { useComponentPreferences } from '../../contexts/ComponentPreferences';
import { useCurrentAgent } from '../../contexts/CurrentAgent';
import { useEntryAgent } from '../../contexts/EntryAgent';
import { useOpeningMessage, useOpeningQuestions, useProfile } from '../../hooks/use-appearances';
import { MessageBodyContainer } from './MessageView';
import type { SimpleChatPreferences } from '.';

const OpeningMessageView = memo(({ isMessagesEmpty }: { isMessagesEmpty?: boolean }) => {
  const { aid } = useEntryAgent();

  const { hideAgentAvatar, backgroundImage } = useComponentPreferences<SimpleChatPreferences>() ?? {};
  const hasBg = !!backgroundImage?.url;

  const openingMessage = useOpeningMessage();
  const openingMessageOutput = useMemo(
    () => openingMessage?.agent.outputVariables?.find((i) => i.name === RuntimeOutputVariable.openingMessage),
    [openingMessage?.agent]
  );
  const openingMessageComponentId =
    openingMessageOutput?.appearance?.componentId ||
    DEFAULT_OUTPUT_COMPONENTS[RuntimeOutputVariable.openingMessage]?.componentId;

  const profile = useProfile();
  const agent = useAgent({ aid: useCurrentAgent().aid });
  const openingQuestions = useOpeningQuestions();
  const openingQuestionsOutput = useMemo(
    () => agent.outputVariables?.find((i) => i.name === RuntimeOutputVariable.openingQuestions),
    [agent.outputVariables]
  );
  const openingQuestionsComponentId =
    openingQuestionsOutput?.appearance?.componentId ||
    DEFAULT_OUTPUT_COMPONENTS[RuntimeOutputVariable.openingQuestions]?.componentId;

  if (
    (!openingMessage?.message || !openingMessageComponentId) &&
    (!openingQuestionsComponentId || !openingQuestions?.questions.length || !isMessagesEmpty)
  ) {
    return null;
  }

  const children = (
    <MessageBodyContainer>
      {openingMessage && openingMessageOutput && openingMessageComponentId && (
        <CustomComponentRenderer
          aid={aid}
          output={{ id: openingMessageOutput.id }}
          instanceId={openingMessageOutput.id}
          componentId={openingMessageComponentId}
          properties={openingMessageOutput.appearance?.componentProperties}
          props={{ output: openingMessageOutput, outputValue: openingMessage.message }}
        />
      )}

      {isMessagesEmpty && openingQuestionsOutput && openingQuestionsComponentId && (
        <CustomComponentRenderer
          aid={aid}
          output={{ id: openingQuestionsOutput.id }}
          instanceId={agent.id}
          componentId={openingQuestionsComponentId}
          properties={openingQuestionsOutput?.appearance?.componentProperties}
          props={{ output: openingQuestionsOutput }}
        />
      )}
    </MessageBodyContainer>
  );

  return hideAgentAvatar ? (
    children
  ) : (
    <UserInfo
      name={(openingMessage?.profile ?? profile).name}
      did={globalThis.blocklet?.appId}
      avatar={getAssetUrl({ aid, filename: (openingMessage?.profile ?? profile).avatar, preset: 'avatar' })}
      alignItems="flex-start"
      UserNameProps={{ sx: { color: hasBg ? 'white' : undefined } }}>
      {children}
    </UserInfo>
  );
});

export default OpeningMessageView;
