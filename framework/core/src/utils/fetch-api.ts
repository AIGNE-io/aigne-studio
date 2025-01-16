import { withQuery } from 'ufo';

import { FetchRequest } from '../definitions/api-parameter';
import { TIMEOUT } from './constants';

const fetchApi = async (request: FetchRequest) => {
  let cookieString = '';
  if (request.cookies) {
    cookieString = Object.entries(request.cookies)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('; ');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Number(TIMEOUT));

  const response = await fetch(withQuery(request.url, request.query || {}), {
    method: request.method,
    headers: {
      ...(request.method !== 'GET' && { 'Content-Type': 'application/json' }),
      ...(cookieString && { Cookie: cookieString.trim() }),
      ...(request.headers || {}),
    },
    body: request.method !== 'GET' ? JSON.stringify(request.body) : undefined,
    credentials: request.cookies ? 'include' : 'same-origin',
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    throw new Error(`fetch ${request.url} api error: ${response.statusText}`);
  }

  return response.json();
};

export default fetchApi;
