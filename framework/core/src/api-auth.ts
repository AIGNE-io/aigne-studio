export type AuthType = 'apiKey' | 'basic' | 'bearer' | 'custom';

export interface BaseAuthConfig {
  type: AuthType;
  token: string;
  in?: 'header' | 'query' | 'cookie';
  key?: string; // HTTP 头部名称，如果你不知道是什么，可以将其保留为 Authorization 或设置为自定义值
}

export interface ApiKeyAuthConfig extends BaseAuthConfig {
  type: 'apiKey';
}

export interface BasicAuthConfig extends BaseAuthConfig {
  type: 'basic';
}

export interface BearerAuthConfig extends BaseAuthConfig {
  type: 'bearer';
}

export interface CustomAuthConfig extends Omit<BaseAuthConfig, 'in' | 'key' | 'token'> {
  type: 'custom';
  getValue: () => Record<string, string>; // 返回自定义 header
}

export type AuthConfig = ApiKeyAuthConfig | BasicAuthConfig | BearerAuthConfig | CustomAuthConfig;

export interface AuthResult {
  headers?: Record<string, string>;
  query?: Record<string, string>;
  cookies?: Record<string, string>;
}

export function getAuthParams(auth?: AuthConfig): AuthResult {
  const result: AuthResult = {};

  if (!auth) return result;

  if (auth.type === 'custom') {
    return { headers: auth.getValue() };
  }

  const paramKey = auth.key || 'Authorization';
  let paramValue = auth.token;

  switch (auth.type) {
    case 'basic':
      paramValue = `Basic ${auth.token}`;
      break;
    case 'bearer':
      paramValue = `Bearer ${auth.token}`;
      break;
    default:
      break;
  }

  switch (auth.in) {
    case 'header':
      result.headers = { [paramKey]: paramValue };
      break;
    case 'query':
      result.query = { [paramKey]: paramValue };
      break;
    case 'cookie':
      result.cookies = { [paramKey]: paramValue };
      break;
    default:
      // 默认放在 header 中
      result.headers = { [paramKey]: paramValue };
  }

  if (Object.keys(result.headers!).length === 0) delete result.headers;
  if (Object.keys(result.query!).length === 0) delete result.query;
  if (Object.keys(result.cookies!).length === 0) delete result.cookies;

  return result;
}
