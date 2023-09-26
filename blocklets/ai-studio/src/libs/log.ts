import { ReadCommitResult } from 'isomorphic-git';
import joinUrl from 'url-join';

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
  return axios.get(joinUrl('/api/projects', projectId, 'logs', ref || '', path || '')).then((res) => res.data);
}
