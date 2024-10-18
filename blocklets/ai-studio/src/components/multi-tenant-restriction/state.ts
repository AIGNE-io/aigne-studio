import { useSessionContext } from '@app/contexts/session';
import { QuotaKey, Quotas } from '@blocklet/aigne-sdk/quotas';
import { create } from 'zustand';

const PRO_ROLE = 'aignePro';

export const useIsPremiumUser = () => {
  const { session } = useSessionContext();
  return session?.user?.passports?.map((x: any) => x.name).includes(PRO_ROLE);
};

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
  const quotas = new Quotas(window.blocklet?.preferences?.quotas);
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
