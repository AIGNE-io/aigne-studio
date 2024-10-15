import { BuiltinModulesGlobalVariableName } from '@blocklet/pages-kit/types/builtin';

export type * from '@blocklet/pages-kit/builtin/async/ai-runtime';

type RuntimeLib = typeof import('@blocklet/pages-kit/builtin/async/ai-runtime');

const {
  useCurrentMessage,
  useCurrentAgent,
  RuntimeDebug,
  ComponentPreferencesProvider,
  CurrentAgentProvider,
  CurrentMessageProvider,
  RuntimeProvider,
  getDefaultOutputComponent,
} = (window as any)[BuiltinModulesGlobalVariableName].require(
  '@blocklet/pages-kit/builtin/async/ai-runtime'
) as RuntimeLib;

export {
  useCurrentMessage,
  useCurrentAgent,
  RuntimeDebug,
  ComponentPreferencesProvider,
  CurrentAgentProvider,
  CurrentMessageProvider,
  RuntimeProvider,
  getDefaultOutputComponent,
};
