import { Page } from '@playwright/test';

export const logout = async ({ page }: { page: Page }) => {
  await page.goto('/');

  const user = page.getByLabel('User info button');
  const hasImage = (await user.locator('img').count()) > 0;

  if (hasImage) {
    await user.click();
    await page.getByRole('menuitem', { name: 'Sign Out' }).click();
    await page.waitForLoadState('networkidle');
  }
};
