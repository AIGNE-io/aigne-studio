type QuotaKey = 'projectLimit' | 'requestLimit' | 'cronJobs' | 'customBrand';

type QuotaPreferenceConfigItem = {
  name: string;
  key: QuotaKey;
  quotas: { passport: string; value: number }[];
};

interface CheckResult {
  passed: boolean;
  quota: number;
}

interface QuotaChecker {
  checkProjectLimit: (used: number, passport?: string) => CheckResult;
  checkRequestLimit: (used: number, passport?: string) => CheckResult;
  checkCronJobs: (passport?: string) => CheckResult;
  checkCustomBrand: (passport?: string) => CheckResult;
}

export class Quotas implements QuotaChecker {
  private quotaConfigs: Record<string, QuotaPreferenceConfigItem> = {};

  constructor(preferenceConfig: QuotaPreferenceConfigItem[]) {
    this.setConfigs(preferenceConfig || []);
  }

  private normalizeQuotaValue(value: number | null | undefined) {
    // 如果 quota 主空，则认为 quota 无限大
    if (value === null || value === undefined) {
      return Number.MAX_SAFE_INTEGER;
    }
    // 把负值看作为 0, 也可理解为禁用
    return value < 0 ? 0 : value;
  }

  private getQuota(quotaKey: QuotaKey, passport: string = '') {
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

  setConfigs(preferenceConfig: QuotaPreferenceConfigItem[]) {
    this.quotaConfigs = preferenceConfig.reduce(
      (acc, curr) => {
        acc[curr.key] = curr;
        return acc;
      },
      {} as Record<string, QuotaPreferenceConfigItem>
    );
  }

  checkProjectLimit(used: number, passport?: string) {
    if (used < 0) {
      throw new Error('Used project limit cannot be negative');
    }
    const quota = this.getQuota('projectLimit', passport);
    return { passed: used < quota, quota };
  }

  checkRequestLimit(used: number, passport?: string) {
    const quota = this.getQuota('requestLimit', passport);
    return { passed: used < quota, quota };
  }

  checkCronJobs(passport?: string) {
    const quota = this.getQuota('cronJobs', passport);
    return { passed: quota > 0, quota };
  }

  checkCustomBrand(passport?: string) {
    const quota = this.getQuota('customBrand', passport);
    return { passed: quota > 0, quota };
  }
}
