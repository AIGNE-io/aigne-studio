import {
  RUNTIME_RESOURCE_BLOCKLET_STATE_GLOBAL_VARIABLE,
  RuntimeResourceBlockletState,
} from '@blocklet/ai-runtime/types/runtime/runtime-resource-blocklet-state';
import { useMemo } from 'react';

export function useResourceBlockletState() {
  return useMemo(() => {
    const state: RuntimeResourceBlockletState = (window as any)?.[RUNTIME_RESOURCE_BLOCKLET_STATE_GLOBAL_VARIABLE];
    return Array.isArray(state?.applications) ? state : undefined;
  }, []);
}
