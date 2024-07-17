import { expect, test } from '@playwright/test';

test('has example projects', async ({ page }) => {
  await page.goto('/projects');

  const examples = page.getByTestId('projects-examples');
  await examples.waitFor();

  await expect(examples).not.toBeEmpty();

  const test = await page.getByTestId('projects-projects-item');
  const count = await test.count();
  console.log(count);
});

test('create project', async ({ page }) => {
  await page.goto('/projects');

  const examples = page.getByTestId('projects-examples');
  await examples.waitFor();

  const newProjectButton = page.getByTestId('newProject');
  await expect(newProjectButton).toBeVisible();

  await newProjectButton.click();
  const newProjectDialog = page.getByTestId('newProjectDialog');
  await expect(newProjectDialog).toBeVisible();

  const nameField = newProjectDialog.getByTestId('projectNameField').locator('input');
  await nameField.fill('Test Project');
  await nameField.press('Enter');

  await page.waitForURL(/\/projects\/\w+/, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=project-page-prompts]');
});

// 复制项目
// todo: count
test('copy project', async ({ page }) => {
  await page.goto('/projects');

  await page.getByTestId('projects-examples').waitFor();
  await expect(page.getByTestId('projects-examples')).toContainText('AI Chat');

  const aiChatExample = await page.getByTestId('projects-examples').locator('div').filter({ hasText: 'AI Chat' });

  // const projectCount = await page.getByTestId('projects-projects').getByText('AI Chat').count();
  await aiChatExample.first().hover();
  await aiChatExample.getByRole('button').click();

  await page.getByRole('menuitem', { name: 'Copy to My Projects' }).click();
  await page.waitForResponse((response) => response.url().includes('/api/projects') && response.status() === 200);

  await expect(page.getByTestId('projects-projects')).toContainText('AI Chat Copy');
  // const newProjectCount = await page.getByTestId('projects-projects').getByText('AI Chat').count();
  // await expect(newProjectCount).toBe(projectCount + 1);
});

test('edit project', async ({ page }) => {
  await page.goto('/projects');

  await page.getByTestId('projects-examples').waitFor();
  await expect(page.getByTestId('projects-examples')).toContainText('AI Chat');

  const aiChatCopy = page.getByTestId('projects-projects').locator('div').filter({ hasText: 'AI Chat Copy' }).first();
  // 编辑
  await aiChatCopy.hover();
  await aiChatCopy.getByRole('button').click();

  const editMenuItem = page.getByRole('menuitem', { name: 'Edit' });
  await expect(editMenuItem).toBeVisible();

  await editMenuItem.click();
  await expect(page.getByText('Edit Project')).toBeVisible();

  await page.getByLabel('Project name').click();
  await page.getByLabel('Project name').fill('AI Chat Copy Edit');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForResponse((response) => response.url().includes('/api/projects') && response.status() === 200, {});
  await expect(page.getByTestId('projects-projects')).toContainText('AI Chat Copy Edit');
});

// pin/unpin
test('pin project', async ({ page }) => {
  await page.goto('/projects');

  await page.getByTestId('projects-examples').waitFor();
  await expect(page.getByTestId('projects-examples')).toContainText('AI Chat');

  const aiChatCopy = page
    .getByTestId('projects-projects-item')
    .locator('div')
    .filter({ hasText: 'AI Chat Copy' })
    .first();
  await expect(aiChatCopy).toBeVisible();

  await aiChatCopy.hover();
  await aiChatCopy.getByRole('button').click();

  const pinMenuItem = page.getByRole('menuitem', { name: 'Pin' });
  await expect(pinMenuItem).toBeVisible();

  await pinMenuItem.click();
  await page.waitForResponse((response) => response.url().includes('/api/projects') && response.status() === 200, {});
});

test('delete project', async ({ page }) => {
  await page.goto('/projects');

  await page.getByTestId('projects-examples').waitFor();
  await expect(page.getByTestId('projects-examples')).toContainText('AI Chat');

  const deleteTarget = page.getByTestId('projects-projects').locator('div').first();
  await expect(deleteTarget).toBeVisible();

  // 删除
  await deleteTarget.hover();
  await deleteTarget.getByRole('button').click();
  const deleteMenuItem = page.getByRole('menuitem', { name: 'Delete' });
  await expect(deleteMenuItem).toBeVisible();

  await deleteMenuItem.click();
  const element = await page.getByText('This will permanently delete');
  const text = await element.textContent();

  console.log('text', text);

  const match = (text || '').match(/"([^"]*)"/);
  console.log('text22', match);
  if (match && match[1]) {
    await page.getByLabel('Please input ').click();
    await page.getByLabel('Please input ').fill(match[1]);
    await page.getByRole('button', { name: 'Delete' }).click();
  }

  await page.waitForResponse((response) => response.url().includes('/api/projects') && response.status() === 200, {});
});

test('new folder', async ({ page }) => {
  await page.goto('/projects');

  // check examples projects
  const examples = page.getByTestId('projects-examples');
  await examples.waitFor();
  await expect(examples).not.toBeEmpty();

  // copy a example project
  await examples.getByText('AI Chat').click();
  await page.waitForURL(/\/projects\/\w+/, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid=project-page-prompts]');

  // create folder
  await page.getByLabel('New Group').getByRole('button').click();
  // todo
  await page.locator('.MuiInputBase-input').first().click();
  await page.locator('.MuiInputBase-input').first().fill('Folder(Test)');
  await page.locator('.MuiInputBase-input').first().press('Enter');
  await expect(await page.getByText('Folder(Test)', { exact: true })).not.toBeEmpty();

  // rename folder
  await page.locator('.MuiStack-root > .MuiButtonBase-root').first().click();
  await page.getByText('Rename', { exact: true }).click();
  await page.locator('.MuiInputBase-input').first().click();
  await page.locator('.MuiInputBase-input').first().press('ArrowRight');
  await page.locator('.MuiInputBase-input').first().fill('Folder(Test Renamed)');
  await page.locator('.MuiInputBase-input').first().press('Enter');
  await expect(await page.getByText('Folder(Test Renamed)', { exact: true })).not.toBeEmpty();

  // delete folder
  await page.locator('.MuiStack-root > .MuiButtonBase-root').first().click();
  await page.getByText('Delete').click();
  await expect(await page.getByText('Folder(Test Renamed)', { exact: true })).not.toBeVisible();
});

// test('new folder agnet', async ({ page }) => {
//   await page.goto('/projects');

//   // check examples projects
//   const examples = page.getByTestId('projects-examples');
//   await examples.waitFor();
//   await expect(examples).not.toBeEmpty();

//   // copy a example project
//   await examples.getByText('AI Chat').click();
//   await page.waitForURL(/\/projects\/\w+/, { waitUntil: 'networkidle' });
//   await page.waitForSelector('[data-testid=project-page-prompts]');

//   // create folder
//   await page.getByLabel('New Group').getByRole('button').click();
//   // todo
//   await page.locator('.MuiInputBase-input').first().click();
//   await page.locator('.MuiInputBase-input').first().fill('Folder(Test)');
//   await page.locator('.MuiInputBase-input').first().press('Enter');
//   await expect(await page.getByText('Folder(Test)', { exact: true })).not.toBeEmpty();
// });

// test('new agent', async ({ page }) => {
//   await page.goto('/projects');

//   // check examples projects
//   const examples = page.getByTestId('projects-examples');
//   await examples.waitFor();
//   await expect(examples).not.toBeEmpty();

//   // copy a example project
//   await examples.getByText('Email Generator').click();
//   await page.waitForURL(/\/projects\/\w+/, { waitUntil: 'networkidle' });
//   await page.waitForSelector('[data-testid=project-page-prompts]');

//   const agentCount = await page.getByText('Test Agent', { exact: true }).count();
//   await page.getByLabel('New Agent').getByRole('button').click();
//   await page.getByLabel('New file').getByRole('textbox').fill('Test Agent');
//   await page.getByLabel('New file').getByRole('textbox').press('Enter');
//   const newAgentCount = await page.getByText('Test Agent', { exact: true }).count();
//   await expect(newAgentCount).toBe(agentCount + 1);

//   console.log('newAgentCount', newAgentCount, 'agentCount', agentCount);

//   // copy agent
//   await page.waitForSelector('[data-testid=project-page-prompts]');
//   const agentCopyCount = await page.getByText('App (Entry) Copy', { exact: true }).count();
//   await page.getByText('App (Entry)').hover();
//   await page.locator('x-pw-pointer').click();
//   await page.getByText('Duplicate').click();
//   const newAgentCopyCount = await page.getByText('App (Entry) Copy', { exact: true }).count();
//   await expect(newAgentCopyCount).toBe(agentCopyCount + 1);

//   // delete agent

//   // await page
//   //   .locator('div:nth-child(4) > div > div > div > div:nth-child(2) > .MuiStack-root > .MuiButtonBase-root')
//   //   .click();
//   // await page.getByText('Rename').click();
//   // await page.getByRole('textbox').first().fill('Test Agent Copy Renamed');
//   // await page.getByRole('textbox').first().press('Enter');

//   // await page
//   //   .locator('div:nth-child(4) > div > div > div > div:nth-child(2) > .MuiStack-root > .MuiButtonBase-root')
//   //   .click();
//   // await page.getByText('Delete').click();

//   // await page.getByLabel('New file').getByRole('button').click();
//   // await page.getByText('Delete').click();
// });

// test('edit agent name and description', async ({ page }) => {
//   await page.goto('/projects');

//   // check examples projects
//   const examples = page.getByTestId('projects-examples');
//   await examples.waitFor();
//   await expect(examples).not.toBeEmpty();

//   // copy a example project
//   await examples.getByText('Email Generator').click();
//   await page.waitForURL(/\/projects\/\w+/, { waitUntil: 'networkidle' });
//   await page.waitForSelector('[data-testid=project-page-prompts]');

//   await page.getByPlaceholder('Unnamed').click();
//   await page.getByPlaceholder('Unnamed').fill('App Renamed');
//   await page.getByPlaceholder('Unnamed').press('Enter');

//   await page.getByPlaceholder("Introduce the agent's").click();
//   await page.getByPlaceholder("Introduce the agent's").fill('this is generated by e2e');
// });

// test('add/delete input', async ({ page }) => {
//   await page.goto('/projects');

//   // check examples projects
//   const examples = page.getByTestId('projects-examples');
//   await examples.waitFor();
//   await expect(examples).not.toBeEmpty();

//   // copy a example project
//   await examples.getByText('Email Generator').click();
//   await page.waitForURL(/\/projects\/\w+/, { waitUntil: 'networkidle' });
//   await page.waitForSelector('[data-testid=project-page-prompts]');

//   // add/delete input
//   await page.getByRole('button', { name: 'Input', exact: true }).click();
//   await page.getByText('Conversation History').click();
//   await page.getByRole('row', { name: 'chatHistory Conversation' }).getByRole('button').click();
//   await page.getByRole('menuitem', { name: 'Delete' }).click();

//   // edit input name
//   await page.getByRole('button', { name: 'Input', exact: true }).click();
//   await page.getByText('Custom input').click();
//   await page
//     .getByRole('row', { name: 'User input Text', exact: true })
//     .getByPlaceholder('Name of Input')
//     .fill('e2eTest');
//   await page.getByRole('row', { name: 'e2eTest User input Text' }).first().getByRole('button').click();
//   await page.getByPlaceholder('Name of Input (e.g. subject,').click();
//   await page.getByPlaceholder('Name of Input (e.g. subject,').fill('e2eTest');
//   await page.getByPlaceholder('Describe to the user how to').click();
//   await page.getByPlaceholder('Describe to the user how to').fill('this is e2e placeholder');
//   await page.getByRole('textbox', { name: 'this is e2e placeholder' }).click();
//   await page.getByRole('textbox', { name: 'this is e2e placeholder' }).fill('this is e2e placeholder');
//   await page
//     .locator('div')
//     .filter({ hasText: /^Min Length$/ })
//     .getByRole('textbox')
//     .click();
//   await page
//     .locator('div')
//     .filter({ hasText: /^Min Length$/ })
//     .getByRole('textbox')
//     .fill('0');
//   await page
//     .locator('div')
//     .filter({ hasText: /^Max Length$/ })
//     .getByRole('textbox')
//     .click();
//   await page
//     .locator('div')
//     .filter({ hasText: /^Max Length$/ })
//     .getByRole('textbox')
//     .fill('100');
//   await page.getByLabel('Is this input required').check();
//   await page.getByRole('button', { name: 'Ok' }).click();

//   await page.getByRole('row', { name: 'question User input Text' }).getByRole('button').click();
//   await page.getByRole('menuitem', { name: 'Delete' }).click();

//   // user input
// });
