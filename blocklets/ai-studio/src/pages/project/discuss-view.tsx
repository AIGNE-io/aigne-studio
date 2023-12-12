import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Comments } from '@blocklet/discuss-kit';
import styled from '@emotion/styled';
import { Box, CircularProgress } from '@mui/material';
import { Suspense } from 'react';

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
