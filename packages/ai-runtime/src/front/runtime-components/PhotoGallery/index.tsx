import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Masonry } from '@mui/lab';
import { Box, Skeleton, Stack, StackProps, Typography } from '@mui/material';
import { Suspense, memo, useRef } from 'react';
import Balancer from 'react-wrap-balancer';

import { AgentErrorView } from '../../components/AgentErrorBoundary';
import CustomComponentRenderer from '../../components/CustomComponentRenderer/CustomComponentRenderer';
import LoadingButton from '../../components/LoadingButton';
import { useActiveAgent } from '../../contexts/ActiveAgent';
import { CurrentAgentProvider, useCurrentAgent } from '../../contexts/CurrentAgent';
import { CurrentMessageProvider } from '../../contexts/CurrentMessage';
import { useEntryAgent } from '../../contexts/EntryAgent';
import { MessageItem, useSession } from '../../contexts/Session';
import { useAppearances, useProfile } from '../../hooks/use-appearances';

export default function PhotoGallery({ resultTitle }: { resultTitle?: string }) {
  const { aid: activeAid } = useActiveAgent();

  return (
    <Stack className="aigne-layout aigne-photo-wall-layout">
      <HeaderView />

      <CurrentAgentProvider aid={activeAid}>
        <InputView
          className="aigne-inputs aigne-photo-wall-inputs"
          maxWidth="md"
          mx="auto"
          width="100%"
          px={{ xs: 2, sm: 3 }}
        />
      </CurrentAgentProvider>

      <OutputView resultTitle={resultTitle} className="aigne-outputs aigne-photo-wall-outputs" gap={2} />
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
      />
    </Stack>
  );
}

function NoOutputs() {
  return (
    <Stack mt={10}>
      <Typography color="text.disabled">You haven't generated any pictures yet.</Typography>
    </Stack>
  );
}

function OutputView({ resultTitle, ...props }: { resultTitle?: string } & StackProps) {
  const { t } = useLocaleContext();

  const ref = useRef<HTMLDivElement>(null);

  const { messages = [], running, loaded, noMoreMessage, loadMoreMessages } = useSession((s) => s);

  return (
    <Stack width="100%" alignItems="center" px={{ xs: 2, sm: 3 }} mt={{ xs: 2, sm: 3 }} {...props}>
      {resultTitle && (
        <Typography width="100%" component="h2" fontSize={36} fontWeight={700} textAlign="center">
          <Balancer>{resultTitle}</Balancer>
        </Typography>
      )}

      {loaded && !messages.length && <NoOutputs />}

      <Masonry
        ref={ref}
        columns={{ xs: 2, sm: 3, md: 4, lg: 5 }}
        spacing={1}
        sequential
        sx={{ width: '100%', overflow: 'hidden', '> *': { borderRadius: 1 } }}>
        {running && (
          <Skeleton
            variant="rectangular"
            sx={{
              // FIXME: default using history height
              height: ref.current?.querySelector('*')?.clientHeight ?? 200,
            }}
          />
        )}

        {messages.map((message) => (
          <OutputItemView key={message.id} message={message} />
        ))}
      </Masonry>

      <Box my={4}>
        {!!messages.length && !noMoreMessage && (
          <LoadingButton variant="outlined" onClick={() => loadMoreMessages()}>
            {t('loadMore')}
          </LoadingButton>
        )}
      </Box>
    </Stack>
  );
}

const OutputItemView = memo(({ message }: { message: MessageItem }) => {
  const { appearanceOutput } = useAppearances({ aid: message.aid });

  return (
    <CurrentAgentProvider key={message.id} aid={message.aid}>
      <CurrentMessageProvider message={message}>
        <Suspense>
          <CustomComponentRenderer
            key={message.id}
            aid={message.aid}
            output={appearanceOutput.outputSettings}
            componentId={appearanceOutput.componentId}
            properties={appearanceOutput.componentProperties}
            fallbackRender={AgentErrorView}
          />
        </Suspense>
      </CurrentMessageProvider>
    </CurrentAgentProvider>
  );
});

function HeaderView() {
  const { aid } = useEntryAgent();
  const profile = useProfile({ aid });

  return (
    <Stack maxWidth="md" mx="auto" width="100%" px={{ xs: 2, sm: 3 }}>
      <CustomComponentRenderer
        aid={aid}
        output={profile.outputSettings}
        componentId={profile.appearance.componentId}
        properties={profile.appearance.componentProperties}
        props={profile.appearance.componentProps}
      />
    </Stack>
  );
}
