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

export interface SimplePagePreferences extends ComponentPreferencesBase {}

export default function SimplePage({ resultTitle, ...preferences }: { resultTitle?: string } & SimplePagePreferences) {
  return (
    <ComponentPreferencesProvider {...preferences}>
      <SimpleLayout pb={4}>
        <HeaderView />

        <InputView className="aigne-inputs aigne-simple-page-inputs" />

        <OutputView className="aigne-outputs aigne-simple-page-outputs" resultTitle={resultTitle} />
      </SimpleLayout>
    </ComponentPreferencesProvider>
  );
}

function HeaderView() {
  const { aid } = useCurrentAgent();
  const profile = useProfile({ aid });

  return (
    <Stack>
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

function InputView({ ...props }: StackProps) {
  const { aid } = useCurrentAgent();
  const { appearanceInput } = useAppearances();

  return (
    <Stack {...props}>
      <CustomComponentRenderer
        aid={aid}
        output={appearanceInput.outputSettings}
        componentId={appearanceInput.componentId}
        properties={appearanceInput.componentProperties}
        props={appearanceInput.componentProps}
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
            key={message.id}
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
