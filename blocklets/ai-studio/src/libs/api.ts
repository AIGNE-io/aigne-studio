import axios from 'axios';

// @ts-ignore
export const PREFIX = window.blocklet?.prefix || '/';

export const API_TIMEOUT = 120 * 1000;

const api = axios.create({
  baseURL: PREFIX,
  timeout: API_TIMEOUT,
});

// Add a global delay for every request in the DEV environment to emulate real-word situation.
// @ts-ignore
if (import.meta.env.DEV) {
  api.interceptors.request.use(async (config) => {
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    return config;
  });
}

export default api;

export const getErrorMessage = (error: any) =>
  error.response?.data?.error?.message || error.response?.data?.message || error.message || error;
