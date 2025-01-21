import type { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Comments } from '@blocklet/discuss-kit';
import styled from '@emotion/styled';
import { Alert, Box, CircularProgress, Stack } from '@mui/material';
import { Suspense, useState } from 'react';

import { useSessionContext } from '../../contexts/session';

export default function DiscussView({
  projectId,
  gitRef,
  assistant,
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
}) {
  const {
    session: { user },
  } = useSessionContext();
  const [hiddenInstaller, setHiddenInstaller] = useState(false);

  const fallback = (
    <Stack alignItems="center" my={10}>
      <Alert severity="warning">Add discuss-kit to continue</Alert>
    </Stack>
  );

  if (hiddenInstaller) {
    return fallback;
  }

  return (
    <Views sx={{ overflow: 'auto' }}>
      <Suspense
        fallback={
          <Box textAlign="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        }>
        <Comments
          data-testid="debug-view-comments"
          target={{ id: `${projectId}-${gitRef}-${assistant.id}`, owner: user.did }}
          displayReaction={false}
          flatView
          autoCollapse
          installerProps={{
            onClose: () => {
              setHiddenInstaller(true);
            },
            fallback,
          }}
        />
      </Suspense>
    </Views>
  );
}

const Views = styled(Box)`
  padding: 20px;

  .comment-editor {
    margin-top: 0;
  }
`;
