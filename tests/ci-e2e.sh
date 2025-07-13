#!/bin/bash
# CI-optimized E2E test runner
set -e

echo "🚀 Running E2E tests in CI mode..."
echo "=================================="

# Verify CI environment
if [ "$CI" != "true" ]; then
    echo "⚠️  Warning: Not running in CI environment"
fi

# Create test results directory
mkdir -p test-results

# Build project
echo "🔨 Building project..."
npm run build

# Run E2E tests with CI configuration
echo "🧪 Running Playwright tests..."
npx playwright test \
  --project=chromium \
  --reporter=github \
  --reporter=json:test-results/results.json \
  --reporter=html:playwright-report

# Check results
if [ $? -eq 0 ]; then
    echo "✅ All E2E tests passed!"
    exit 0
else
    echo "❌ E2E tests failed!"
    echo "📊 Test artifacts saved to test-results/ and playwright-report/"
    exit 1
fi