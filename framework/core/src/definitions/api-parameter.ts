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

export type HTTPMethod = 'get' | 'post' | 'put' | 'delete';
export type FormatMethod = Uppercase<HTTPMethod> | Lowercase<HTTPMethod>;

export type API = {
  url: string;
  method?: FormatMethod;
  auth?: AuthConfig;
};

export type ParameterLocation = 'path' | 'query' | 'body' | 'header' | 'cookie';
export type OpenAPIParameter = {
  in?: ParameterLocation;
};

export type FetchRequest = {
  url: string;
  method: string;

  headers?: Record<string, string>;
  query?: Record<string, string>;
  cookies?: Record<string, string>;

  body?: Record<string, any>;
};

export interface ParametersResult extends AuthResult {
  url: string;
  method: string;

  body?: Record<string, any>;
}
