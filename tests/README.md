# E2E Testing with Playwright

This directory contains comprehensive end-to-end tests for the Tray application using Playwright.

## 🧪 Test Suites

- **`basic-user-journey.spec.ts`** - Core user interactions (create, edit, navigate, delete)
- **`drag-and-drop.spec.ts`** - Drag and drop functionality
- **`indexeddb-persistence.spec.ts`** - Data persistence and recovery
- **`data-migration.spec.ts`** - Data migration scenarios
- **`import-export.spec.ts`** - File import/export functionality

## 🚀 Running Tests

### Local Development
```bash
# Run all E2E tests with UI
npm run test:e2e

# Run headless (faster)
npm run test:e2e:headless

# Debug mode (step through tests)
npm run test:e2e:debug

# CI mode (Chromium only)
npm run test:e2e:ci
```

### CI/CD
```bash
# Run optimized CI script
npm run test:ci

# Or use the shell script directly
./tests/ci-e2e.sh
```

## 📁 Test Structure

Each test uses unique session IDs to prevent interference:
```typescript
const sessionId = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
await page.goto(`/?sessionId=${sessionId}`);
```

## 🔧 Configuration

- **Local**: HTML reporter with trace collection
- **CI**: GitHub Actions reporter with JSON export
- **Browsers**: Chromium (CI), Chromium + Firefox + Safari (local)
- **Retries**: 2 retries in CI, 0 locally

## 📊 Test Reports

### Local Development
- HTML report opens automatically after test run
- Screenshots/videos saved for failures
- Traces available for debugging

### CI/CD
- Reports uploaded as GitHub Actions artifacts
- Screenshots and videos preserved for 30 days
- JSON results for further processing

## 🐛 Debugging Failed Tests

1. **Local**: Use `npm run test:e2e:debug` for step-by-step debugging
2. **CI**: Download artifacts from GitHub Actions
3. **Screenshots**: Check `test-results/` directory
4. **Videos**: Available for failed tests
5. **Traces**: Use `npx playwright show-trace trace.zip`

## 🏗️ Adding New Tests

1. Create new `.spec.ts` file in `tests/` directory
2. Use unique session ID in `beforeEach`
3. Follow existing patterns for locators and interactions
4. Add proper test descriptions and comments

## 📋 Best Practices

- ✅ Use unique session IDs for test isolation
- ✅ Use specific locators (`.tray-title` vs `.tray`)
- ✅ Wait for proper state before assertions
- ✅ Test both success and error scenarios
- ✅ Keep tests focused and independent
- ❌ Don't rely on test execution order
- ❌ Don't use hardcoded timeouts
- ❌ Don't test implementation details

## 🔄 CI/CD Integration

The tests are integrated into GitHub Actions with:
- ✅ Parallel execution (unit tests + E2E tests)
- ✅ Artifact collection (reports, screenshots, videos)
- ✅ Proper browser dependency management
- ✅ Optimized for speed (Chromium only in CI)
- ✅ Automatic retry on flaky tests