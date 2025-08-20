// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig, devices } from '@playwright/test';

// import { TestConstants } from './tests/utils/constants';

const seconds = 1000;
const retries = 3;

const headless = process.env.HEADLESS !== 'false';

const singleTenantAppName = process.env.SINGLE_TENANT_APP_NAME;
const singleTenantBaseURL = process.env.SINGLE_TENANT_APP_URL;

// const multipleTenantAppName = process.env.MULTIPLE_TENANT_APP_NAME;
// const multipleTenantBaseURL = process.env.MULTIPLE_TENANT_APP_URL;

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
  timeout: 60 * seconds,
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries,
  /* Opt out of parallel tests on CI. */
  workers: undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  expect: {
    timeout: seconds,
  },
  use: {
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'retain-on-failure',
    launchOptions: headless
      ? undefined
      : {
          headless: false,
          devtools: false,
        },
  },
  globalSetup: './scripts/global-setup.ts',
  globalTeardown: './scripts/global-teardown.ts',
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'initialize',
      testMatch: 'initialize.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        appName: singleTenantAppName,
        baseURL: singleTenantBaseURL,
      },
    },
    // @lipeng 需要修复业务上的 e2e 测试
    // // single tenant mode
    // {
    //   name: 'singleTenant.setup',
    //   testMatch: 'single-tenant/mode.setup.ts',
    //   use: {
    //     appName: singleTenantAppName,
    //     baseURL: singleTenantBaseURL,
    //   },
    // },
    // {
    //   name: 'singleTenant.setup.admin',
    //   testMatch: 'single-tenant/admin.setup.ts',
    //   dependencies: ['singleTenant.setup'],
    //   use: {
    //     storageStatePath: 'singleTenant.admin',
    //     appName: singleTenantAppName,
    //     baseURL: singleTenantBaseURL,
    //   },
    // },
    // {
    //   name: 'singleTenant.test.admin',
    //   testMatch: /single-tenant\/admin\/.*\.spec\.ts/,
    //   dependencies: ['singleTenant.setup.admin'],
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     storageState: TestConstants.authFilePath('singleTenant.admin'),
    //     appName: singleTenantAppName,
    //     baseURL: singleTenantBaseURL,
    //   },
    // },
    // {
    //   name: 'singleTenant.setup.guest',
    //   testMatch: 'single-tenant/guest.setup.ts',
    //   dependencies: ['singleTenant.setup'],
    //   use: {
    //     storageStatePath: 'singleTenant.guest',
    //     appName: singleTenantAppName,
    //     baseURL: singleTenantBaseURL,
    //   },
    // },
    // {
    //   name: 'singleTenant.test.guest',
    //   dependencies: ['singleTenant.setup.guest'],
    //   testMatch: /single-tenant\/guest\/.*\.spec\.ts/,
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     storageState: TestConstants.authFilePath('singleTenant.guest'),
    //     appName: singleTenantAppName,
    //     baseURL: singleTenantBaseURL,
    //   },
    // },
    // // multiple tenant mode
    // {
    //   name: 'multipleTenant.setup',
    //   testMatch: 'multiple-tenant/mode.setup.ts',
    //   use: {
    //     appName: multipleTenantAppName,
    //     baseURL: multipleTenantBaseURL,
    //   },
    // },
    // {
    //   name: 'multipleTenant.setup.admin',
    //   testMatch: 'multiple-tenant/admin.setup.ts',
    //   dependencies: ['multipleTenant.setup'],
    //   use: {
    //     storageStatePath: 'multipleTenant.admin',
    //     appName: multipleTenantAppName,
    //     baseURL: multipleTenantBaseURL,
    //   },
    // },
    // {
    //   name: 'multipleTenant.test.admin',
    //   testMatch: /multiple-tenant\/admin\/.*\.spec\.ts/,
    //   dependencies: ['multipleTenant.setup.admin'],
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     storageState: TestConstants.authFilePath('multipleTenant.admin'),
    //     appName: multipleTenantAppName,
    //     baseURL: multipleTenantBaseURL,
    //   },
    // },
    // {
    //   name: 'multipleTenant.setup.guest',
    //   testMatch: 'multiple-tenant/guest.setup.ts',
    //   dependencies: ['multipleTenant.setup'],
    //   use: {
    //     storageStatePath: 'multipleTenant.guest',
    //     appName: multipleTenantAppName,
    //     baseURL: multipleTenantBaseURL,
    //   },
    // },
    // {
    //   name: 'multipleTenant.test.guest',
    //   dependencies: ['multipleTenant.setup.guest'],
    //   testMatch: /multiple-tenant\/guest\/.*\.spec\.ts/,
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     storageState: TestConstants.authFilePath('multipleTenant.guest'),
    //     appName: multipleTenantAppName,
    //     baseURL: multipleTenantBaseURL,
    //   },
    // },
  ],
});
