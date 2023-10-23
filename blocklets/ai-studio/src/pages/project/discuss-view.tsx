import { Comments } from '@blocklet/discuss-kit';
import styled from '@emotion/styled';
import { Box } from '@mui/material';

import { TemplateYjs } from '../../../api/src/store/projects';
import { useSessionContext } from '../../contexts/session';

export default function DiscussView({
  projectId,
  gitRef,
  template,
}: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
}) {
  const {
    session: { user },
  } = useSessionContext();

  return (
    <Views>
      <Comments
        target={{ id: `${projectId}-${gitRef}-${template.id}`, owner: user.did }}
        displayReaction={false}
        flatView
        autoCollapse
      />
    </Views>
  );
}

const Views = styled(Box)`
  padding: 16px;

  .comment-editor {
    margin-top: 0;
  }
`;
