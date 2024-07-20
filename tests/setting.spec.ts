import { Page, expect, test } from '@playwright/test';

test.beforeEach('route to agent page', async ({ page }) => {
  await page.goto('/projects');

  // check examples projects
  const examples = page.getByTestId('projects-examples');
  await examples.waitFor();
  await expect(examples).not.toBeEmpty();

  // copy a example project
  await examples.getByText('AI Chat').click({ force: true });
  await page.waitForURL(/\/projects\/\w+/, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=project-page-prompts]');
});

const generalSlide = async (page: Page, sliderId: string) => {
  // 定位到滑块
  const slider = page.getByTestId(sliderId).getByTestId('slider');
  // 定位到边界
  const sliderBoundingBox = await slider.boundingBox();
  if (!sliderBoundingBox) {
    throw new Error('Unable to locate the slider');
  }

  const startX = sliderBoundingBox.x + sliderBoundingBox.width; // 当前滑块位置
  const startY = sliderBoundingBox.y + sliderBoundingBox.height / 2;
  const targetX = sliderBoundingBox.x; // 滑动条的最右端

  // 4. 使用 mouse API 模拟拖拽操作
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(targetX, startY);
  await page.mouse.up();
};

test('setting-model', async ({ page }) => {
  await page.getByTestId('header-actions-setting').click();
  await page.waitForTimeout(500);

  await page.getByRole('tab', { name: 'Model' }).click();
  const modelSelect = page.getByTestId('project-setting-model').getByTestId('model-select-field');
  await modelSelect.click();
  await page.getByRole('option', { name: 'GPT4o' }).click();

  await generalSlide(page, 'project-settings-temperature');
  const temperatureValue = (await page
    .getByTestId('project-settings-temperature')
    .locator('.MuiSlider-thumb input')
    .getAttribute('aria-valuenow')) as string;
  expect(parseFloat(temperatureValue)).toBe(0);

  await generalSlide(page, 'project-settings-topP');
  const topPValue = (await page
    .getByTestId('project-settings-topP')
    .locator('.MuiSlider-thumb input')
    .getAttribute('aria-valuenow')) as string;
  expect(parseFloat(topPValue)).toBe(0);

  await generalSlide(page, 'project-settings-presence-penalty');
  const presenceValue = (await page
    .getByTestId('project-settings-presence-penalty')
    .locator('.MuiSlider-thumb input')
    .getAttribute('aria-valuenow')) as string;
  expect(parseFloat(presenceValue)).toBe(0);

  await generalSlide(page, 'project-settings-frequency-penalty');
  const frequencyValue = (await page
    .getByTestId('project-settings-frequency-penalty')
    .locator('.MuiSlider-thumb input')
    .getAttribute('aria-valuenow')) as string;
  expect(parseFloat(frequencyValue)).toBe(0);

  await generalSlide(page, 'project-settings-max-tokens');
  const tokensValue = (await page
    .getByTestId('project-settings-max-tokens')
    .locator('.MuiSlider-thumb input')
    .getAttribute('aria-valuenow')) as string;
  expect(parseFloat(tokensValue)).toBe(1);
});
