#!/bin/bash
set -e

echo "Running Playwright E2E tests..."
echo "==============================="

# Check if running in CI
if [ "$CI" = "true" ]; then
    echo "Running in CI environment"
    BROWSER_ARG="--project=chromium"
    REPORTER_ARG="--reporter=github"
else
    echo "Running in local environment"
    BROWSER_ARG=""
    REPORTER_ARG="--reporter=html"
fi

# Build the project (skip install in CI - should be done separately)
if [ "$CI" != "true" ]; then
    echo "Installing dependencies..."
    npm install
    
    echo "Installing Playwright browsers..."
    npx playwright install --with-deps
fi

echo "Building project..."
npm run build

# Run Playwright tests
echo "Running E2E tests..."
if npx playwright test $BROWSER_ARG $REPORTER_ARG; then
    echo "✅ All E2E tests passed!"
    exit 0
else
    echo "❌ Some E2E tests failed!"
    
    # In local development, try to open report
    if [ "$CI" != "true" ] && command -v xdg-open >/dev/null 2>&1; then
        echo "Opening test report..."
        npx playwright show-report --port=0 &
    fi
    
    exit 1
fi