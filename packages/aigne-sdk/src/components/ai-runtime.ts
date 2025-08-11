import * as aiRuntime from '@blocklet/ai-runtime/front';
import { BuiltinModulesGlobalVariableName } from '@blocklet/pages-kit/types/builtin';

export type * from '@blocklet/ai-runtime/front';

type RuntimeLib = typeof import('@blocklet/ai-runtime/front');

// 使用最新的 ai-runtime package 替换 pages-kit，已支持 @blocklet/ai-runtime/front 中新增的 api
(window as any)[BuiltinModulesGlobalVariableName].modules['@blocklet/pages-kit/builtin/async/ai-runtime'] = aiRuntime;

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
  Runtime,
  useSession,
  useSessions,
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
  Runtime,
  useSession,
  useSessions,
};
