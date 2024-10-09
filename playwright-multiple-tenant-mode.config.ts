import { defineConfig, devices } from '@playwright/test';

import { TestConstants } from './tests/utils/constants';

const timeout = 10000;

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  timeout: 9 * timeout,
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  expect: {
    timeout: timeout,
  },
  use: {
    baseURL: process.env.TEST_BLOCKLET_APP_URL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Configure projects for major browsers */
  projects: [
    // multiple tenant mode
    {
      name: 'multipleTenantMode',
      testMatch: 'multiple-tenant-mode.setup.ts',
    },
    {
      name: 'multipleTenantModeAdminSetup',
      testMatch: 'admin.setup.ts',
      dependencies: ['multipleTenantMode'],
    },
    {
      name: 'multipleTenantModeAdminRoleTests',
      use: { ...devices['Desktop Chrome'], storageState: TestConstants.authFilePath('admin') },
      dependencies: ['multipleTenantModeAdminSetup'],
      testMatch: /multiple-tenant\/admin\/.*\.spec\.ts/,
    },
    {
      name: 'multipleTenantModeGuestSetup',
      testMatch: 'guest.setup.ts',
      dependencies: ['multipleTenantModeAdminRoleTests'],
    },
    {
      name: 'multipleTenantModeGuestRoleTests',
      use: { ...devices['Desktop Chrome'], storageState: TestConstants.authFilePath('guest') },
      dependencies: ['multipleTenantModeGuestSetup'],
      testMatch: /multiple-tenant\/guest\/.*\.spec\.ts/,
    },
  ],
});
