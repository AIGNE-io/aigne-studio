import { test as setup } from '@playwright/test';

type CustomTestFixtures = {
  storageStatePath: string;
  appName: string;
};

const test = setup.extend<CustomTestFixtures>({
  storageStatePath: ['', { option: true }],
  appName: ['', { option: true }],
});

const customSetup = test.extend({});

export default customSetup;
