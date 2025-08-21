import { Page, expect } from '@playwright/test';

export const checkTenantMode = async ({
  page,
  isSingle = true,
  openPricePlan = false,
}: {
  page: Page;
  isSingle?: boolean;
  openPricePlan?: boolean;
}) => {
  await page.goto('/.well-known/service/admin/website/branding');
  await page.waitForLoadState('networkidle');

  const setupLaterButton = page
    .locator('iframe[title="Setup Wizard"]')
    .contentFrame()
    .getByRole('button', { name: 'Setup Later' });
  if ((await setupLaterButton.count()) > 0) {
    await setupLaterButton.click();
  }

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

  if (openPricePlan) {
    await page.locator('button', { has: page.getByText('AIGNE Runtime') }).click();
    const AIGNEFrame = page.frameLocator('iframe');
    await AIGNEFrame.getByText('Plans and pricing').click();
    const lastSwitch = AIGNEFrame.locator('button[role="switch"]').last();
    if (!((await lastSwitch.getAttribute('aria-checked')) || '').includes('true')) {
      await lastSwitch.click();
      await AIGNEFrame.getByRole('button', { name: 'Save Changes' }).click();
    }

    await page.locator('button', { has: page.getByText('AIGNE Studio') }).click();
    const frame = page.frameLocator('iframe');
    await frame.getByText('Plans and pricing').click();
    const lastSwitch1 = frame.locator('button[role="switch"]').last();
    if (!((await lastSwitch1.getAttribute('aria-checked')) || '').includes('true')) {
      await lastSwitch1.click();
      await frame.getByRole('button', { name: 'Save Changes' }).click();
    }
  }
};
