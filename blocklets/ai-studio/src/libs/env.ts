import { ServiceMode, getServiceModePermissionMap } from '@blocklet/ai-runtime/common';

export const Config = {
  get serviceModePermissionMap() {
    const { serviceMode } = window?.blocklet?.preferences as {
      serviceMode: ServiceMode;
    };

    return getServiceModePermissionMap(serviceMode);
  },
};
