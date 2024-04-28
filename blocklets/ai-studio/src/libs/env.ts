import { getServiceModePermissionMap } from '@blocklet/ai-runtime/common';
import { ServiceMode } from '@blocklet/ai-runtime/types';

export const Config = {
  get serviceModePermissionMap() {
    const { serviceMode } = window?.blocklet?.preferences as {
      serviceMode: ServiceMode;
    };

    return getServiceModePermissionMap(serviceMode);
  },
};
