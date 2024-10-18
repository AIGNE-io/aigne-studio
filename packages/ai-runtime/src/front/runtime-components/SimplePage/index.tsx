import { Stack, StackProps, Typography } from '@mui/material';
import { Suspense, memo } from 'react';
import Balancer from 'react-wrap-balancer';

import { AgentErrorView } from '../../components/AgentErrorBoundary';
import CustomComponentRenderer from '../../components/CustomComponentRenderer/CustomComponentRenderer';
import SimpleLayout from '../../components/Layout/SimpleLayout';
import { DEFAULT_HEADER_COMPONENT_ID } from '../../constants';
import { ComponentPreferencesBase, ComponentPreferencesProvider } from '../../contexts/ComponentPreferences';
import { CurrentAgentProvider, useCurrentAgent } from '../../contexts/CurrentAgent';
import { CurrentMessageProvider } from '../../contexts/CurrentMessage';
import { MessageItem, useSession } from '../../contexts/Session';
import { useAppearances, useProfile } from '../../hooks/use-appearances';
import InputsView from '../SimpleChat/InputsView';
import OpeningMessageView from './OpeningMessageView';

export interface SimplePagePreferences extends ComponentPreferencesBase {}

export default function SimplePage({ resultTitle, ...preferences }: { resultTitle?: string } & SimplePagePreferences) {
  return (
    <ComponentPreferencesProvider {...preferences}>
      <SimpleLayout pb={4}>
        <HeaderView px={{ xs: 2, sm: 3 }} />

        <OpeningMessageView my={4} px={{ xs: 2, sm: 3 }} />

        <InputsView className="aigne-inputs aigne-simple-page-inputs" />

        <OutputView
          className="aigne-outputs aigne-simple-page-outputs"
          resultTitle={resultTitle}
          px={{ xs: 2, sm: 3 }}
        />
      </SimpleLayout>
    </ComponentPreferencesProvider>
  );
}

function HeaderView(props: StackProps) {
  const { aid } = useCurrentAgent();
  const profile = useProfile({ aid });

  return (
    <Stack {...props}>
      <CustomComponentRenderer
        aid={aid}
        output={profile.outputSettings}
        componentId={profile.appearance.componentId || DEFAULT_HEADER_COMPONENT_ID}
        properties={profile.appearance.componentProperties}
        props={profile.appearance.componentProps}
      />
    </Stack>
  );
}

function OutputView({ resultTitle, ...props }: { resultTitle?: string } & StackProps) {
  const lastMessage = useSession((s) => s.messages?.at(0));

  return (
    <Stack gap={2} mt={4} {...props}>
      {lastMessage && (
        <>
          {resultTitle && (
            <Typography width="100%" component="h5" fontSize={36} fontWeight={700} textAlign="center">
              <Balancer>{resultTitle}</Balancer>
            </Typography>
          )}

          <Stack>
            <OutputItemView message={lastMessage} />
          </Stack>
        </>
      )}
    </Stack>
  );
}

const OutputItemView = memo(({ message }: { message: MessageItem }) => {
  const { appearanceOutput } = useAppearances({ aid: message.aid });

  return (
    <CurrentAgentProvider aid={message.aid}>
      <CurrentMessageProvider message={message}>
        <Suspense>
          <CustomComponentRenderer
            aid={message.aid}
            output={appearanceOutput.outputSettings}
            componentId={appearanceOutput.componentId}
            properties={appearanceOutput.componentProperties}
            props={appearanceOutput.componentProps}
            fallbackRender={AgentErrorView}
          />
        </Suspense>
      </CurrentMessageProvider>
    </CurrentAgentProvider>
  );
});
