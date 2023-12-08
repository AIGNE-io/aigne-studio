import { HistoryRounded } from '@mui/icons-material';
import { Button } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import CommitsTip from '../../components/template-form/commits-tip';
import BranchButton from './branch-button';
import SaveButton from './save-button';
import { useProjectState } from './state';

export default function HeaderActions() {
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const navigate = useNavigate();

  const {
    state: { loading, commits, project },
  } = useProjectState(projectId, gitRef);

  const simpleMode = !project || project?.gitType === 'simple';

  return (
    <>
      {!simpleMode && <BranchButton projectId={projectId} gitRef={gitRef} filepath={filepath} />}
      <CommitsTip
        loading={loading}
        commits={commits}
        hash={gitRef}
        onCommitSelect={(commit) => {
          navigate(joinURL('..', commit.oid), { state: { filepath } });
        }}>
        <Button sx={{ minWidth: 32, minHeight: 32 }}>
          <HistoryRounded />
        </Button>
      </CommitsTip>
      <SaveButton projectId={projectId} gitRef={gitRef} />
    </>
  );
}
