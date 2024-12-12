export type QuotaKey = 'projectLimit' | 'requestLimit' | 'cronJobs' | 'customBrand';

type QuotaPreferenceConfigItem = {
  name: string;
  key: QuotaKey;
  quotas: { passport: string; value: number }[];
};

const UNLIMITED_QUOTA = Number.MAX_SAFE_INTEGER;

export class Quotas {
  private premiumPlanEnabled = false;

  private quotaConfigs: Record<string, QuotaPreferenceConfigItem> = {};

  constructor(preferences: Record<string, any>) {
    this.setPreferences(preferences);
  }

  private normalizeQuotaValue(value: number | null | undefined) {
    // 如果 quota 主空，则认为 quota 无限大
    if (value === null || value === undefined) {
      return UNLIMITED_QUOTA;
    }
    // 把负值看作为 0, 也可理解为禁用
    return value < 0 ? 0 : value;
  }

  setPreferences(preferences: Record<string, any>) {
    this.quotaConfigs = ((preferences?.quotas || []) as QuotaPreferenceConfigItem[]).reduce(
      (acc, curr) => {
        acc[curr.key] = curr;
        return acc;
      },
      {} as Record<string, QuotaPreferenceConfigItem>
    );
    this.premiumPlanEnabled = preferences?.premiumPlanEnabled;
  }

  getPassportQuota(quotaKey: QuotaKey, passport: string = '') {
    // 管理员或未开启 premium plan 时, 无任何限制
    if (['admin', 'owner'].includes(passport) || !this.premiumPlanEnabled) {
      return UNLIMITED_QUOTA;
    }
    const config = this.quotaConfigs[quotaKey];
    if (!config) {
      throw new Error(`Quota config for ${quotaKey} not found`);
    }
    const matchedQuota = config.quotas.find((x) => x.passport === passport);
    if (matchedQuota) {
      return this.normalizeQuotaValue(matchedQuota.value);
    }
    // 未指定 passport 的 quota 配置
    const fallback = config.quotas.find((x) => !x.passport?.trim());
    return this.normalizeQuotaValue(fallback?.value);
  }

  getQuota(quotaKey: QuotaKey, passports?: string | string[]) {
    return Math.max(
      0,
      ...[undefined, ...(Array.isArray(passports) ? passports : [passports])].map((i) =>
        this.getPassportQuota(quotaKey, i)
      )
    );
  }

  checkProjectLimit(used: number, passports?: string[]) {
    if (used < 0) {
      throw new Error('`used` cannot be negative');
    }
    const quota = this.getQuota('projectLimit', passports);
    return used <= quota;
  }

  checkRequestLimit(used: number, passports?: string[]) {
    const quota = this.getQuota('requestLimit', passports);
    return used <= quota;
  }

  checkCronJobs(passports?: string[]) {
    const quota = this.getQuota('cronJobs', passports);
    return quota > 0;
  }

  checkCustomBrand(passports?: string[]) {
    const quota = this.getQuota('customBrand', passports);
    return quota > 0;
  }
}
