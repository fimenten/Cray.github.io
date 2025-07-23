import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [
    ['github'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { open: 'never', outputFolder: 'playwright-report' }]
  ] : [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:9000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true,
  },
  
  // Increase timeout for mobile tests
  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile device configurations
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        // Additional mobile settings for better reliability
        isMobile: true,
        hasTouch: true,
        actionTimeout: 15000,
      },
      timeout: 90000, // Longer timeout for mobile tests
      testMatch: '**/mobile-*.spec.ts',
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        isMobile: true,
        hasTouch: true,
        actionTimeout: 15000,
      },
      timeout: 90000,
      testMatch: '**/mobile-*.spec.ts',
    },
    {
      name: 'tablet',
      use: { 
        ...devices['iPad Pro'],
        isMobile: true,
        hasTouch: true,
        actionTimeout: 15000,
      },
      timeout: 90000,
      testMatch: '**/mobile-*.spec.ts',
    },
    // Disable other browsers for faster testing
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  webServer: {
    command: 'npm run bundle && npx serve . -l 9000',
    url: 'http://localhost:9000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});