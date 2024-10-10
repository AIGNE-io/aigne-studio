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
export default defineConfig<{
  storageStatePath: string;
  appName: string;
}>({
  timeout: 9 * timeout,
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  expect: {
    timeout: timeout,
  },
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Configure projects for major browsers */
  projects: [
    // single tenant mode
    {
      name: 'singleTenant.setup',
      testMatch: 'single-tenant/mode.setup.ts',
      use: {
        appName: process.env.SINGLE_TENANT_APP_NAME,
        baseURL: process.env.SINGLE_TENANT_APP_URL,
      },
    },
    {
      name: 'singleTenant.setup.admin',
      testMatch: 'single-tenant/admin.setup.ts',
      dependencies: ['singleTenant.setup'],
      use: {
        storageStatePath: 'singleTenant.admin',
        appName: process.env.SINGLE_TENANT_APP_NAME,
        baseURL: process.env.SINGLE_TENANT_APP_URL,
      },
    },
    {
      name: 'singleTenant.test.admin',
      testMatch: /single-tenant\/admin\/.*\.spec\.ts/,
      dependencies: ['singleTenant.setup.admin'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: TestConstants.authFilePath('singleTenant.admin'),
        appName: process.env.SINGLE_TENANT_APP_NAME,
        baseURL: process.env.SINGLE_TENANT_APP_URL,
      },
    },
    {
      name: 'singleTenant.setup.guest',
      testMatch: 'single-tenant/guest.setup.ts',
      dependencies: ['singleTenant.setup'],
      use: {
        storageStatePath: 'singleTenant.guest',
        appName: process.env.SINGLE_TENANT_APP_NAME,
        baseURL: process.env.SINGLE_TENANT_APP_URL,
      },
    },
    {
      name: 'singleTenant.test.guest',
      dependencies: ['singleTenant.setup.guest'],
      testMatch: /single-tenant\/guest\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: TestConstants.authFilePath('singleTenant.guest'),
        appName: process.env.SINGLE_TENANT_APP_NAME,
        baseURL: process.env.SINGLE_TENANT_APP_URL,
      },
    },

    // multiple tenant mode
    {
      name: 'multipleTenant.setup',
      testMatch: 'multiple-tenant/mode.setup.ts',
      use: {
        appName: process.env.MULTIPLE_TENANT_APP_NAME,
        baseURL: process.env.MULTIPLE_TENANT_APP_URL,
      },
    },
    {
      name: 'multipleTenant.setup.admin',
      testMatch: 'multiple-tenant/admin.setup.ts',
      dependencies: ['multipleTenant.setup'],
      use: {
        storageStatePath: 'multipleTenant.admin',
        appName: process.env.MULTIPLE_TENANT_APP_NAME,
        baseURL: process.env.MULTIPLE_TENANT_APP_URL,
      },
    },
    {
      name: 'multipleTenant.test.admin',
      testMatch: /multiple-tenant\/admin\/.*\.spec\.ts/,
      dependencies: ['multipleTenant.setup.admin'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: TestConstants.authFilePath('multipleTenant.admin'),
        appName: process.env.MULTIPLE_TENANT_APP_NAME,
        baseURL: process.env.MULTIPLE_TENANT_APP_URL,
      },
    },
    {
      name: 'multipleTenant.setup.guest',
      testMatch: 'multiple-tenant/guest.setup.ts',
      dependencies: ['multipleTenant.setup'],
      use: {
        storageStatePath: 'multipleTenant.guest',
        appName: process.env.MULTIPLE_TENANT_APP_NAME,
        baseURL: process.env.MULTIPLE_TENANT_APP_URL,
      },
    },
    {
      name: 'multipleTenant.test.guest',
      dependencies: ['multipleTenant.setup.guest'],
      testMatch: /multiple-tenant\/guest\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: TestConstants.authFilePath('multipleTenant.guest'),
        appName: process.env.MULTIPLE_TENANT_APP_NAME,
        baseURL: process.env.MULTIPLE_TENANT_APP_URL,
      },
    },
  ],
});
