import type { ReadCommitResult } from 'isomorphic-git';
import { joinURL } from 'ufo';

import axios from './api';

export type Commit = ReadCommitResult & {
  commit: ReadCommitResult['commit'] & {
    author: ReadCommitResult['commit']['author'] & {
      fullName?: string;
      avatar?: string;
      did?: string;
    };
  };
};

export async function getLogs({
  projectId,
  ref,
  path,
}: {
  projectId: string;
  ref?: string;
  path?: string;
}): Promise<{ commits: Commit[] }> {
  return axios.get(joinURL('/api/projects', projectId, 'logs', ref || '', path || '')).then((res) => res.data);
}
