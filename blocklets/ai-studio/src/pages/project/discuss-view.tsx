import { useComponent } from '@app/contexts/component';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Comments } from '@blocklet/discuss-kit';
import styled from '@emotion/styled';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import { Suspense } from 'react';

import { useSessionContext } from '../../contexts/session';

const DISCUSS_KIT_DID = 'z8ia1WEiBZ7hxURf6LwH21Wpg99vophFwSJdu';

export default function DiscussView({
  projectId,
  gitRef,
  assistant,
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
}) {
  const discuss = useComponent(DISCUSS_KIT_DID);
  const {
    session: { user },
  } = useSessionContext();

  if (!discuss)
    return (
      <Stack alignItems="center" my={10}>
        <Alert severity="warning">Add discuss-kit to continue</Alert>
      </Stack>
    );

  return (
    <Views>
      <Suspense
        fallback={
          <Box textAlign="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        }>
        <Comments
          target={{ id: `${projectId}-${gitRef}-${assistant.id}`, owner: user.did }}
          displayReaction={false}
          flatView
          autoCollapse
        />
      </Suspense>
    </Views>
  );
}

const Views = styled(Box)`
  padding: 16px;

  .comment-editor {
    margin-top: 0;
  }
`;
