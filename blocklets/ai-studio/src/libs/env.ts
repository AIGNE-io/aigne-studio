import { getServiceModePermissionMap } from '@blocklet/ai-runtime/common';
import { ServiceMode } from '@blocklet/ai-runtime/types';

export const Config = {
  get serviceModePermissionMap() {
    return getServiceModePermissionMap(window.blocklet?.tenantMode as ServiceMode);
  },
};
