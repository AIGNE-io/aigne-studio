import { useSessionContext } from '@app/contexts/session';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { QuotaKey, Quotas } from '@blocklet/aigne-sdk/quotas';
import { create } from 'zustand';

import type { Plan } from './pricing-table';

export const premiumPassport = window.blocklet?.preferences?.premiumPassport;

function preparePlansData(locale: 'en' | 'zh') {
  try {
    const plans = locale === 'zh' ? window.blocklet?.preferences?.plansZh : window.blocklet?.preferences?.plansEn;
    if (!plans) {
      return null;
    }
    const parsed = (typeof plans === 'string' ? JSON.parse(plans) : plans) as Plan[];
    if (parsed && parsed.length !== 3) {
      console.warn(`Expected 3 plans, but found ${plans.length}. Please check the configuration.[locale: ${locale}]`);
    }
    return parsed;
  } catch (e) {
    console.warn(e);
    return null;
  }
}

export const usePlans = () => {
  const { locale } = useLocaleContext();
  const { session } = useSessionContext();
  const isPremiumUser = useIsPremiumUser();
  const plans = preparePlansData(locale);
  if (plans) {
    // 登录用户, 隐藏首个 plan 的 button
    plans[0]!.qualified = !!session?.user;
    // 如果当前用户是 premium 用户, 调整 premium plan
    plans[1]!.qualified = isPremiumUser;
  }
  return plans;
};

export const useIsPremiumUser = () => {
  const { session } = useSessionContext();
  return session?.user?.passports?.map((x: any) => x.name).includes(premiumPassport);
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
