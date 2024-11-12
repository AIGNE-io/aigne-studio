import { getComponentWebEndpoint } from '@blocklet/sdk/lib/component';
import { joinURL, withQuery } from 'ufo';

export interface CallComponentWithTokenOptions {
  name: string;
  path: string;
  method: RequestInit['method'];
  headers?: { [key: string]: any };
  loginToken?: string;
  query?: { [key: string]: any };
  body?: { [key: string]: any };
}

export async function callComponentWithToken<T = any>({
  name,
  path,
  method,
  headers = {},
  loginToken,
  query = {},
  body,
}: CallComponentWithTokenOptions): Promise<T> {
  const endpoint = getComponentWebEndpoint(name);

  if (loginToken) headers.Cookie = `login_token=${loginToken}`;

  if (body) headers['Content-Type'] = 'application/json';

  const result = await fetch(withQuery(joinURL(endpoint, path), query), {
    method,
    headers,
    body: method?.toLowerCase() !== 'get' && body ? JSON.stringify(body) : undefined,
  });

  let json;
  let error;

  try {
    json = await result.json();
  } catch (e) {
    error = e;
  }

  if (!result.ok || error) {
    throw new Error(
      `call component ${name}:${path} failed with status ${result.status}: ${error?.message || json?.message}`
    );
  }

  return json;
}
