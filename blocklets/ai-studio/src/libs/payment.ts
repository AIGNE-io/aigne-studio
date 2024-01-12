import axios from './ai-kit-api';

export async function getPaymentKitStatus() {
  return axios.get('/api/app/service/status').then((res) => res.data);
}

export async function getRegister() {
  return axios.post('/api/app/service/register').then((res) => res.data);
}
