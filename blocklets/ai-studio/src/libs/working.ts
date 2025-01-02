import { joinURL } from 'ufo';

import type { WorkingCommitInput as CommitWorkingInput } from '../../api/src/routes/working';
import axios from './api';

export async function commitFromWorking({
  projectId,
  ref,
  input,
}: {
  projectId: string;
  ref: string;
  input: CommitWorkingInput;
}): Promise<{}> {
  return axios.post(joinURL('/api/projects', projectId, 'workings', ref, 'commit'), input).then((res) => res.data);
}
