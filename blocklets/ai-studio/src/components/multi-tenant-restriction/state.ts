import { useIsAdmin, useSessionContext } from '@app/contexts/session';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { QuotaKey, Quotas } from '@blocklet/aigne-sdk/quotas';
import { create } from 'zustand';

import type { Plan } from './pricing-table';

type RestrictionType = QuotaKey | 'anonymousRequest';

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
  const plans = preparePlansData(locale as 'en' | 'zh');
  const currentPlanIndex = useCurrentPlan();
  if (plans) {
    // 登录用户, 隐藏首个 plan 的 button
    plans[0]!.qualified = !!session?.user;
    // 如果当前用户是 premium 用户, 调整 premium plan
    plans[1]!.qualified = isPremiumUser;
    // plan#active
    if (currentPlanIndex !== null) {
      plans[currentPlanIndex]!.active = true;
    }
  }
  return plans;
};

export const useIsPremiumUser = () => {
  const { session } = useSessionContext();
  return session?.user?.passports?.map((x: any) => x.name).includes(premiumPassport);
};

export const useCurrentPlan = () => {
  const { session } = useSessionContext();
  const isAdmin = useIsAdmin();
  const isPremiumUser = useIsPremiumUser();
  if (!session?.user) return null;
  if (isAdmin) return 2;
  if (isPremiumUser) return 1;
  return 0;
};

export const useMultiTenantRestrictionStore = create<{
  planUpgradeVisible: boolean;
  type: RestrictionType | null;
  showPlanUpgrade: (type?: RestrictionType | null) => void;
  hidePlanUpgrade: () => void;
}>((set) => ({
  planUpgradeVisible: false,
  type: null,
  showPlanUpgrade: (type?: RestrictionType | null) => set({ planUpgradeVisible: true, type }),
  hidePlanUpgrade: () => set({ planUpgradeVisible: false }),
}));

export const showPlanUpgrade = (type?: RestrictionType) => {
  useMultiTenantRestrictionStore.setState({ planUpgradeVisible: true, type });
};

export const premiumPlanEnabled = !!window.blocklet?.preferences?.premiumPlanEnabled;

export function useMultiTenantRestriction() {
  const { planUpgradeVisible, type, showPlanUpgrade, hidePlanUpgrade } = useMultiTenantRestrictionStore();
  const { session } = useSessionContext();
  const isAdmin = useIsAdmin();
  const isPremiumUser = useIsPremiumUser();
  const passports = session?.user?.passports?.map((x: any) => x.name);
  const quotas = new Quotas(window.blocklet?.preferences);
  const quotaChecker = {
    checkCronJobs() {
      if (quotas.checkCronJobs(passports)) return true;
      showPlanUpgrade('cronJobs');
      return false;
    },
    checkCustomBrand() {
      if (quotas.checkCustomBrand(passports)) return true;
      showPlanUpgrade('customBrand');
      return false;
    },
    checkAnonymousRequest() {
      if (isAdmin || isPremiumUser) return true;
      showPlanUpgrade('anonymousRequest');
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
