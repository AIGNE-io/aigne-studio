import { useSessionContext } from '@app/contexts/session';
import { aigneStudioApi } from '@blocklet/aigne-sdk/api/api';
import { QuotaKey, Quotas } from '@blocklet/aigne-sdk/quotas';
import { useRequest } from 'ahooks';
import { create } from 'zustand';

export const useMultiTenantRestrictionStore = create<{
  planUpgradeVisible: boolean;
  type: QuotaKey | null;
  showPlanUpgrade: (type?: QuotaKey | null) => void;
  hidePlanUpgrade: () => void;
}>((set) => ({
  planUpgradeVisible: false,
  type: null,
  showPlanUpgrade: (type?: QuotaKey | null) => set({ planUpgradeVisible: true, type }),
  hidePlanUpgrade: () => set({ planUpgradeVisible: false }),
}));

export const showPlanUpgrade = (type?: QuotaKey) => {
  useMultiTenantRestrictionStore.setState({ planUpgradeVisible: true, type });
};

export function useMultiTenantRestriction() {
  const { planUpgradeVisible, type, showPlanUpgrade, hidePlanUpgrade } = useMultiTenantRestrictionStore();
  const { session } = useSessionContext();
  const quotas = new Quotas(window.blocklet?.preferences?.quotas, window.blocklet?.tenantMode === 'multiple');
  const quotaChecker = {
    checkCronJobs() {
      if (quotas.checkCronJobs(session?.user?.role)) return true;
      showPlanUpgrade('cronJobs');
      return false;
    },
    checkCustomBrand() {
      if (quotas.checkCustomBrand(session?.user?.role)) return true;
      showPlanUpgrade('customBrand');
      return false;
    },
  };

  return {
    planUpgradeVisible,
    type,
    showPlanUpgrade,
    hidePlanUpgrade,
    quotaChecker,
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
