import { getServiceModePermissionMap } from '@blocklet/ai-runtime/common';
import { ServiceMode } from '@blocklet/ai-runtime/types';
import config from '@blocklet/sdk/lib/config';

export const Config = {
  get serviceModePermissionMap() {
    const { disablePaymentProject } = window?.blocklet?.preferences as {
      disablePaymentProject?: boolean;
    };

    return getServiceModePermissionMap(config.env.tenantMode as ServiceMode, { disablePaymentProject });
  },
};
