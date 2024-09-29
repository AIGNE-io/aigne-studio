import { useIsAdmin } from '@app/contexts/session';
import { create } from 'zustand';

export const useIsMultiTenantRestricted = () => {
  const isAdmin = useIsAdmin();
  const isMultiTenantMode = window.blocklet?.tenantMode === 'multiple';
  // tenantMode 为 multiple 时对非 admin 用户进行限制
  return isMultiTenantMode && !isAdmin;
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
