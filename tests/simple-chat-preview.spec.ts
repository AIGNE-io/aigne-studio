import { expect, test } from '@playwright/test';

test('preview example project', async ({ page, context }) => {
  await page.goto('/projects');

  // check examples projects
  const examples = page.getByTestId('projects-examples');
  await examples.waitFor();
  await expect(examples).not.toBeEmpty();

  // copy a example project
  await examples.getByText('AI Chat').click();
  await page.waitForURL(/\/projects\/\w+/, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=project-page-prompts]');

  // select entry agent
  await page
    .locator('[role=listitem]')
    .filter({ hasText: /\(Entry\)/i })
    .click();
  await page.waitForURL(/gHzU28\.yaml/);

  // open preview page
  await page
    .locator('button')
    .filter({ hasText: /^Preview$/i })
    .click();

  const previewPagePromise = context.waitForEvent('page');
  await page
    .locator('a')
    .filter({ hasText: /^Preview in new tab$/i })
    .click();
  const previewPage = await previewPagePromise;

  // chat with agent
  const question = `Hello, I am test bot, current time is ${new Date().toISOString()}`;

  previewPage.route(/\/api\/ai\/call/, (route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      path: 'tests/simple-chat-ai-stream-response.txt',
    });
  });

  await previewPage.getByTestId('runtime-input-question').fill(question);
  await previewPage.getByTestId('runtime-submit-button').click();

  const lastMessage = previewPage.locator('.message-item').last();
  await expect(lastMessage.locator('.user-message-content')).toContainText(question);
  await expect(lastMessage.locator('.assistant-message-content')).toContainText('Hello! How can I assist you today?');

  // clear session
  const responsePromise = previewPage.waitForResponse(/sessions\/\w+\/clear/);
  await previewPage.click('[data-testid=aigne-runtime-header-menu-button]');
  await previewPage.locator('.MuiMenuItem-root', { hasText: 'Clear Session' }).click();
  await responsePromise;
  await expect(previewPage.locator('.message-item')).toHaveCount(0);
});
