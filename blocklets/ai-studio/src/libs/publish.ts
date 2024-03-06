import { PublishInput } from '@api/routes/publish';
import PublishSetting from '@api/store/models/publish-setting';

import axios from './api';

export async function getProjectPublishSetting(
  projectId: string
): Promise<{ projectPublishSettings: PublishSetting[] }> {
  return axios.get(`/api/publish/${projectId}`).then((res) => res.data);
}

export async function savaPublishSetting(input: PublishInput): Promise<PublishSetting> {
  return axios.post('/api/publish', input).then((res) => res.data);
}

export async function updatePublishSetting(input: PublishInput): Promise<PublishSetting> {
  return axios.put('/api/publish', input).then((res) => res.data);
}
