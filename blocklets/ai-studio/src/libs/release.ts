import { CreateReleaseInput, UpdateReleaseInput } from '@api/routes/release';
import Release from '@api/store/models/release';
import { joinURL } from 'ufo';

import axios from './api';

export async function getReleases({
  projectId,
  projectRef,
  assistantId,
}: {
  projectId: string;
  projectRef?: string;
  assistantId?: string;
}): Promise<{ releases: Release[] }> {
  return axios.get('/api/releases', { params: { projectId, projectRef, assistantId } }).then((res) => res.data);
}

export async function createRelease(input: CreateReleaseInput): Promise<Release> {
  return axios.post('/api/releases', input).then((res) => res.data);
}

export async function updateRelease(releaseId: string, input: UpdateReleaseInput): Promise<Release> {
  return axios.patch(joinURL('/api/releases', releaseId), input).then((res) => res.data);
}
