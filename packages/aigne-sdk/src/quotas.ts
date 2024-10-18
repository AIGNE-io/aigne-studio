export type QuotaKey = 'projectLimit' | 'requestLimit' | 'cronJobs' | 'customBrand';

type QuotaPreferenceConfigItem = {
  name: string;
  key: QuotaKey;
  quotas: { passport: string; value: number }[];
};

const UNLIMITED_QUOTA = Number.MAX_SAFE_INTEGER;

export class Quotas {
  private quotaConfigs: Record<string, QuotaPreferenceConfigItem> = {};

  constructor(preferenceConfig: QuotaPreferenceConfigItem[]) {
    this.setConfigs(preferenceConfig || []);
  }

  private normalizeQuotaValue(value: number | null | undefined) {
    // 如果 quota 主空，则认为 quota 无限大
    if (value === null || value === undefined) {
      return UNLIMITED_QUOTA;
    }
    // 把负值看作为 0, 也可理解为禁用
    return value < 0 ? 0 : value;
  }

  setConfigs(preferenceConfig: QuotaPreferenceConfigItem[]) {
    this.quotaConfigs = preferenceConfig.reduce(
      (acc, curr) => {
        acc[curr.key] = curr;
        return acc;
      },
      {} as Record<string, QuotaPreferenceConfigItem>
    );
  }

  getPassportQuota(quotaKey: QuotaKey, passport: string = '') {
    // 管理员或非多租户模式下, 无任何限制
    if (['admin', 'owner'].includes(passport)) {
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
      ...(Array.isArray(passports) ? passports : [passports]).map((i) => this.getPassportQuota(quotaKey, i))
    );
  }

  checkProjectLimit(used: number, passport?: string) {
    if (used < 0) {
      throw new Error('`used` cannot be negative');
    }
    const quota = this.getQuota('projectLimit', passport);
    return used < quota;
  }

  checkRequestLimit(used: number, passport?: string) {
    const quota = this.getQuota('requestLimit', passport);
    return used < quota;
  }

  checkCronJobs(passport?: string) {
    const quota = this.getQuota('cronJobs', passport);
    return quota > 0;
  }

  checkCustomBrand(passport?: string) {
    const quota = this.getQuota('customBrand', passport);
    return quota > 0;
  }
}
