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
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  expect: {
    timeout: timeout,
  },
  use: {
    baseURL: TestConstants.appUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Configure projects for major browsers */
  projects: [
    // single tenant mode
    // {
    //   name: 'singleTenantMode',
    //   testMatch: 'single-tenant-mode.setup.ts',
    // },
    {
      name: 'singleTenantModeAdminSetup',
      testMatch: 'admin.setup.ts',
    },
    {
      name: 'singleTenantModeAdminRoleTests',
      use: { ...devices['Desktop Chrome'], storageState: TestConstants.authFilePath('admin') },
      dependencies: ['singleTenantModeAdminSetup'],
      testMatch: ['single-tenant/admin/**/*.spec.ts'],
      testIgnore: ['single-tenant/admin/projects.spec.ts', 'single-tenant/admin/runtime.spec.ts'],
    },
    {
      name: 'singleTenantModeAdminRoleProjectsTests',
      use: { ...devices['Desktop Chrome'], storageState: TestConstants.authFilePath('admin') },
      dependencies: ['singleTenantModeAdminRoleTests'],
      testMatch: ['single-tenant/admin/projects.spec.ts', 'single-tenant/admin/runtime.spec.ts'],
    },
    // {
    //   name: 'singleTenantModeGuestSetup',
    //   testMatch: 'guest.setup.ts',
    //   dependencies: ['singleTenantModeAdminRoleTests'],
    // },
    // {
    //   name: 'singleTenantModeGuestRoleTests',
    //   use: { ...devices['Desktop Chrome'], storageState: TestConstants.authFilePath('guest') },
    //   dependencies: ['singleTenantModeGuestSetup'],
    //   testMatch: /single-tenant\/guest\/.*\.spec\.ts/,
    // },
    // // multiple tenant mode
    // {
    //   name: 'multipleTenantMode',
    //   testMatch: 'multiple-tenant-mode.setup.ts',
    //   dependencies: ['singleTenantModeGuestRoleTests'],
    // },
    // {
    //   name: 'multipleTenantModeAdminSetup',
    //   testMatch: 'admin.setup.ts',
    //   dependencies: ['multipleTenantMode'],
    // },
    // {
    //   name: 'multipleTenantModeAdminRoleTests',
    //   use: { ...devices['Desktop Chrome'], storageState: TestConstants.authFilePath('admin') },
    //   dependencies: ['multipleTenantModeAdminSetup'],
    //   testMatch: /multiple-tenant\/admin\/.*\.spec\.ts/,
    // },
    // {
    //   name: 'multipleTenantModeGuestSetup',
    //   testMatch: 'guest.setup.ts',
    //   dependencies: ['multipleTenantModeAdminRoleTests'],
    // },
    // {
    //   name: 'multipleTenantModeGuestRoleTests',
    //   use: { ...devices['Desktop Chrome'], storageState: TestConstants.authFilePath('guest') },
    //   dependencies: ['multipleTenantModeGuestSetup'],
    //   testMatch: /multiple-tenant\/guest\/.*\.spec\.ts/,
    // },

    // {
    //   name: 'ownerSetup',
    //   testMatch: 'owner.setup.ts',
    // },
    // {
    //   name: 'owner',
    //   use: { ...devices['Desktop Chrome'], storageState: TestConstants.authFilePath('owner') },
    //   dependencies: ['adminSetup'],
    //   testIgnore: /admin-.*\.spec\.ts/,
    // },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'], storageState: 'playwright/.auth/user.json' },
    //   dependencies: ['setup'],
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'], storageState: 'playwright/.auth/user.json' },
    //   dependencies: ['setup'],
    // },
    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
