import { BuiltinModulesGlobalVariableName } from '@blocklet/pages-kit/types/builtin';

export type * from '@blocklet/pages-kit/builtin/async/ai-runtime';

type RuntimeLib = typeof import('@blocklet/pages-kit/builtin/async/ai-runtime');

const {
  getAgent,
  getDefaultOutputComponent,
  CurrentMessageOutputProvider,
  CurrentMessageProvider,
  RuntimeDebug,
  RuntimeProvider,
  ComponentPreferencesProvider,
  CurrentAgentProvider,
  ScrollView,
} = (window as any)[BuiltinModulesGlobalVariableName].require(
  '@blocklet/pages-kit/builtin/async/ai-runtime'
) as RuntimeLib;

export {
  getAgent,
  getDefaultOutputComponent,
  CurrentMessageOutputProvider,
  CurrentMessageProvider,
  RuntimeDebug,
  RuntimeProvider,
  ComponentPreferencesProvider,
  CurrentAgentProvider,
  ScrollView,
};
