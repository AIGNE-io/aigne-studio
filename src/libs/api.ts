import axios from 'axios';

export const PREFIX = window.blocklet?.prefix || '/';

export const API_TIMEOUT = 30 * 1000;

const api = axios.create({
  baseURL: PREFIX,
  timeout: API_TIMEOUT,
});

export default api;

export const getErrorMessage = (error: any) =>
  error.response?.data?.error?.message || error.response?.data?.message || error.message || error;
