import { AppRegisterResult, AppStatusResult } from '@blocklet/ai-kit/api/call';

import api from './api';

export async function appStatus(): Promise<AppStatusResult> {
  return api.get('/api/ai-kit/status').then((res) => res.data);
}

export async function appRegister(): Promise<AppRegisterResult> {
  return api.post('/api/ai-kit/register').then((res) => res.data);
}
