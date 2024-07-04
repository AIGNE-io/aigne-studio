import { BuiltinModulesGlobalVariableName } from '@blocklet/pages-kit/types/builtin';

export type * from '@blocklet/pages-kit/builtin/async/ai-runtime';

type RuntimeLib = typeof import('@blocklet/pages-kit/builtin/async/ai-runtime');

const { useCurrentMessage, useCurrentAgent, useRuntimeState, useSessionState, ComponentPreferencesProvider } = (
  window as any
)[BuiltinModulesGlobalVariableName].require('@blocklet/pages-kit/builtin/async/ai-runtime') as RuntimeLib;

export { ComponentPreferencesProvider, useCurrentMessage, useCurrentAgent, useRuntimeState, useSessionState };
