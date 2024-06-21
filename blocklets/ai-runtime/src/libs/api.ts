import { createAxios } from '@blocklet/js-sdk';

const api = createAxios({
  baseURL: window.blocklet ? window.blocklet.prefix : '/',
  timeout: 200000,
});

export default api;
