import { Button, Stack } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import CommitsTip from '../../components/template-form/commits-tip';
import History from './icons/history';
import SaveButton from './save-button';
import { useProjectState } from './state';

export default function HeaderActions() {
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const navigate = useNavigate();

  const {
    state: { loading, commits },
  } = useProjectState(projectId, gitRef);

  return (
    <Stack flexDirection="row" gap={1} alignItems="center">
      <CommitsTip
        loading={loading}
        commits={commits}
        hash={gitRef}
        onCommitSelect={(commit) => {
          navigate(joinURL('..', commit.oid), { state: { filepath } });
        }}>
        <Button sx={{ minWidth: 0, minHeight: 0, width: 32, height: 32, border: '1px solid #E5E7EB' }}>
          <History sx={{ fontSize: 20 }} />
        </Button>
      </CommitsTip>
      <SaveButton projectId={projectId} gitRef={gitRef} />
    </Stack>
  );
}
