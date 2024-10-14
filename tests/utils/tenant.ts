import { Page, expect } from '@playwright/test';

export const checkTenantMode = async ({ page, isSingle = true }: { page: Page; isSingle?: boolean }) => {
  await page.goto('/.well-known/service/admin/configuration');
  await page.waitForLoadState('networkidle');

  const configItem = await page.locator('.config-item', {
    has: page.locator('.config-label', { hasText: 'Multiple Tenant Mode' }),
  });
  await expect(configItem).toBeVisible();
  const checkbox = await configItem.locator('input[type="checkbox"]');
  if (await checkbox.isChecked()) {
    await checkbox.click();
  }
  await expect(checkbox).not.toBeChecked();
  await expect(
    configItem.locator('.config-desc', { hasText: 'This blocklet runs in single tenant mode' })
  ).toBeVisible();

  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await expect(
    configItem.locator('.config-desc', { hasText: 'This blocklet runs in multiple tenant mode' })
  ).toBeVisible();

  if (isSingle) {
    if (await checkbox.isChecked()) {
      await checkbox.click();
    }
    await expect(checkbox).not.toBeChecked();
    await expect(
      configItem.locator('.config-desc', { hasText: 'This blocklet runs in single tenant mode' })
    ).toBeVisible();
  }
};
