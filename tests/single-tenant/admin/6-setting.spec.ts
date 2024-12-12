import { expect, test } from '@playwright/test';

import { createProject } from '../../utils/project';

let projectUrl: string;

test.beforeAll('clean and create project', async ({ browser }) => {
  const page = await browser.newPage();
  await createProject({ page });
  projectUrl = page.url();
});

test.beforeEach(async ({ page }) => {
  await page.goto(projectUrl);
  await page.waitForLoadState('networkidle');
});

test('setting-appearance', async ({ page }) => {
  await page.getByTestId('header-actions-setting').click();
  await page.getByRole('tab', { name: 'Appearance' }).click();

  const colorBlock = page.getByTestId('primary-color').locator('div>div').nth(2).locator('div');
  await colorBlock.click();
  const selectedColor = await colorBlock.evaluate((el) => {
    return getComputedStyle(el).backgroundColor;
  });

  const colorElement = page.getByTestId('chrome-picker-box').first();
  const backgroundColor = await colorElement.evaluate((el) => {
    return getComputedStyle(el).backgroundColor;
  });
  expect(backgroundColor).toEqual(selectedColor);

  const titleFont = page.getByTestId('font-family-setting-title').locator('>div>div');
  await titleFont.click();
  await page.getByRole('option', { name: 'Cedarville Cursive' }).click();
  await expect(titleFont).toContainText('Cedarville Cursive');

  const bodyFont = page.getByTestId('font-family-setting-body').locator('>div>div');
  await bodyFont.click();
  await page.getByRole('option', { name: 'Playfair Display SC' }).click();
  await expect(bodyFont).toContainText('Playfair Display SC');
});

test('setting-basic', async ({ page }) => {
  await page.getByTestId('header-actions-setting').click();
  await page.getByRole('tab', { name: 'Basic' }).click();
  // todo avatar
  const projectName = page.getByLabel('Project name');
  await projectName.fill('AI Chat(E2ETest)');
  const projectDescription = page.getByLabel('Project description');
  await projectDescription.fill('This is e2e test');

  await page.getByTestId('CloseRoundedIcon').click();
  await page.getByTestId('header-actions-setting').click();
  await page.getByRole('tab', { name: 'Basic' }).click();
  await expect(projectName).toHaveAttribute('value', 'AI Chat(E2ETest)');
  await expect(projectDescription).toHaveValue('This is e2e test');
});

test('add branch', async ({ page }) => {
  await page.getByTestId('header-actions-setting').click();
  await page.getByRole('tab', { name: 'Git' }).click();
  await page.getByLabel('Professional Mode').check();
  const gitPromise = page.waitForResponse((response) => response.url().includes('/api/projects'));
  await page.getByRole('button', { name: 'Save' }).first().click();
  await gitPromise;
  await page.goto(projectUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="branch-icon"]', { state: 'visible', timeout: 10000 });
  await page.getByTestId('branch-icon').first().click({ force: true });

  await page.getByRole('menuitem', { name: 'New Branch' }).click();
  await page.getByLabel('Name').fill('e2e-test');
  const responsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/branches')
  );
  await page.getByRole('button', { name: 'Save' }).click();
  await responsePromise;

  await page.getByTestId('branch-icon').click();
  await expect(page.getByText('e2e-test')).toBeVisible();
});

test('history', async ({ page }) => {
  await page.getByLabel('History', { exact: true }).click();
  await page.locator('li.commit-item').last().click();
  await page.locator('body').press('ControlOrMeta+s');
  await page.getByLabel('Note').fill('this is from e2eTest');
  const savePromise = page.waitForResponse(/workings\/\w+\/commit/);
  await page.getByRole('button', { name: 'Save' }).click();
  await savePromise;
  await page.getByLabel('History', { exact: true }).click();
  await expect(page.locator('li.commit-item').first()).toContainText('this is from e2eTest');
});
