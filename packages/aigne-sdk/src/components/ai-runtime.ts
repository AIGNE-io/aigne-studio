import { BuiltinModulesGlobalVariableName } from '@blocklet/pages-kit/types/builtin';

export type * from '@blocklet/pages-kit/builtin/async/ai-runtime';

type RuntimeLib = typeof import('@blocklet/pages-kit/builtin/async/ai-runtime');

const {
  useCurrentMessage,
  useCurrentAgent,
  useRuntimeState,
  useSessionState,
  RuntimeDebug,
  ComponentPreferencesProvider,
  CurrentAgentProvider,
  CurrentMessageProvider,
  RuntimeProvider,
} = (window as any)[BuiltinModulesGlobalVariableName].require(
  '@blocklet/pages-kit/builtin/async/ai-runtime'
) as RuntimeLib;

export {
  useCurrentMessage,
  useCurrentAgent,
  useRuntimeState,
  useSessionState,
  RuntimeDebug,
  ComponentPreferencesProvider,
  CurrentAgentProvider,
  CurrentMessageProvider,
  RuntimeProvider,
};
