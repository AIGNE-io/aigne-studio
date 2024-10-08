import { useIsAdmin, useIsProUser } from '@app/contexts/session';
import { aigneStudioApi } from '@blocklet/aigne-sdk/api/api';
import { useRequest } from 'ahooks';
import { create } from 'zustand';

export const useIsMultiTenantRestricted = () => {
  const isAdmin = useIsAdmin();
  const isProUser = useIsProUser();
  const isMultiTenantMode = window.blocklet?.tenantMode === 'multiple';
  // aigne 在 multiple tenant 模式下会有一些使用限制, admin 和 pro 用户不受限制
  return isMultiTenantMode && !isAdmin && !isProUser;
};

type MultiTenantRestrictionType =
  | 'projectRequestLimitExceeded'
  | 'projectLimitExceeded'
  | 'useCronJob'
  | 'customBranding';

export const useMultiTenantRestrictionStore = create<{
  planUpgradeVisible: boolean;
  type: MultiTenantRestrictionType | null;
  showPlanUpgrade: (type?: MultiTenantRestrictionType | null) => void;
  hidePlanUpgrade: () => void;
}>((set) => ({
  planUpgradeVisible: false,
  type: null,
  showPlanUpgrade: (type?: MultiTenantRestrictionType | null) => set({ planUpgradeVisible: true, type }),
  hidePlanUpgrade: () => set({ planUpgradeVisible: false }),
}));

export const showPlanUpgrade = (type?: MultiTenantRestrictionType) => {
  useMultiTenantRestrictionStore.setState({ planUpgradeVisible: true, type });
};

export function useMultiTenantRestriction() {
  const { planUpgradeVisible, type, showPlanUpgrade, hidePlanUpgrade } = useMultiTenantRestrictionStore();
  const isRestricted = useIsMultiTenantRestricted();
  return {
    isRestricted,
    planUpgradeVisible,
    type,
    showPlanUpgrade,
    hidePlanUpgrade,
    checkMultiTenantRestriction: (type: MultiTenantRestrictionType) => {
      if (isRestricted) {
        showPlanUpgrade(type);
        return false;
      }
      return true;
    },
  };
}

export async function getProPaymentLink(): Promise<string | null> {
  // await new Promise((resolve) => setTimeout(resolve, 3000));
  return aigneStudioApi.get('/api/pro-payment-link').then((res) => res.data?.link);
}

export function useProPaymentLink() {
  const { data, loading, error } = useRequest(getProPaymentLink);
  return { proPaymentLink: loading || error ? null : data, loading };
}
