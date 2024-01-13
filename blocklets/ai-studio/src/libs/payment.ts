import { TSubscriptionExpanded } from '@did-pay/client';

import axios from './ai-kit-api';

export interface AppStatusResult {
  id: string;
  subscription?: TSubscriptionExpanded;
}

export async function getAIKitServiceStatus(): Promise<AppStatusResult> {
  return axios.get('/api/app/service/status').then((res) => res.data);
}

export interface AppRegisterResult {
  appId: string;
  paymentLink?: string;
}

export async function aiKitRegister(): Promise<AppRegisterResult> {
  return axios.post('/api/app/service/register').then((res) => res.data);
}
