#!/bin/bash

# Migration Testing Script
# Runs comprehensive migration tests to ensure data compatibility

set -e

echo "🧪 Running Migration Tests..."
echo "==============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${YELLOW}Running: $test_name${NC}"
    echo "Command: $test_command"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ $test_name FAILED${NC}"
        ((TESTS_FAILED++))
    fi
}

# Build the project first
echo "📦 Building project..."
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed - cannot run migration tests${NC}"
    exit 1
fi

# Run migration tests
echo -e "\n🔄 Running Data Migration Tests..."
run_test "Data Structure Refactoring Tests" "node test/data-structure-refactoring.test.js"
run_test "IndexedDB Migration Tests" "node test/indexeddb-migration.test.js" 
run_test "Migration Compatibility Tests" "node test/migration-compatibility.test.js"

# Test with specific fixture files
echo -e "\n📁 Testing with fixture files..."

# Check if fixture files exist
FIXTURES_DIR="test/fixtures"
if [ ! -d "$FIXTURES_DIR" ]; then
    echo -e "${RED}❌ Fixtures directory not found: $FIXTURES_DIR${NC}"
    ((TESTS_FAILED++))
else
    echo -e "${GREEN}✅ Fixtures directory found${NC}"
    
    # List available fixtures
    echo "Available test fixtures:"
    ls -la "$FIXTURES_DIR"/*.json || echo "No JSON fixtures found"
fi

# Run performance migration test
echo -e "\n⚡ Testing migration performance..."
run_test "Large Data Migration Performance" "node -e '
const { deserialize } = require(\"./dist/io\");
const fs = require(\"fs\");

// Create large test data
const createLargeData = (size) => ({
  id: \"large-test\",
  name: \"Large Test Data\", 
  parentId: \"\",
  children: Array.from({length: size}, (_, i) => ({
    id: `child-${i}`,
    name: `Child ${i}`,
    parentId: \"large-test\",
    children: [],
    borderColor: \"#ffffff\",
    created_dt: new Date().toISOString(),
    flexDirection: \"column\",
    host_url: null,
    filename: null,
    isFolded: false,
    properties: {index: i},
    hooks: [],
    isDone: false
  })),
  borderColor: \"#ffffff\",
  created_dt: new Date().toISOString(),
  flexDirection: \"column\",
  host_url: null,
  filename: null,
  isFolded: false,
  properties: {},
  hooks: [],
  isDone: false
});

const testData = createLargeData(1000);
const serialized = JSON.stringify(testData);

console.log(`Serialized size: ${(serialized.length / 1024).toFixed(2)} KB`);

const start = Date.now();
const deserialized = deserialize(serialized);
const time = Date.now() - start;

console.log(`Deserialization time: ${time}ms`);
console.log(`Children count: ${deserialized.children.length}`);

if (time > 5000) {
  console.error(\"Performance test failed: took too long\");
  process.exit(1);
}

console.log(\"Performance test passed\");
'"

# Memory usage test
echo -e "\n💾 Testing memory usage during migration..."
run_test "Memory Usage Test" "node --max-old-space-size=512 -e '
const { deserialize, serialize } = require(\"./dist/io\");

// Test multiple serialization/deserialization cycles
const testData = {
  id: \"memory-test\",
  name: \"Memory Test\",
  parentId: \"\",
  children: Array.from({length: 100}, (_, i) => ({
    id: `memory-child-${i}`,
    name: `Memory Child ${i}`,
    parentId: \"memory-test\",
    children: [],
    borderColor: \"#ffffff\",
    created_dt: new Date().toISOString(),
    flexDirection: \"column\",
    host_url: null,
    filename: null,
    isFolded: false,
    properties: {data: \"x\".repeat(1000)}, // 1KB per child
    hooks: [],
    isDone: false
  })),
  borderColor: \"#ffffff\",
  created_dt: new Date().toISOString(),
  flexDirection: \"column\",
  host_url: null,
  filename: null,
  isFolded: false,
  properties: {},
  hooks: [],
  isDone: false
};

// Run multiple cycles to test for memory leaks
for (let i = 0; i < 50; i++) {
  const serialized = JSON.stringify(testData);
  const deserialized = deserialize(serialized);
  const reSerialized = serialize(deserialized);
  
  if (i % 10 === 0) {
    console.log(`Cycle ${i} completed`);
  }
}

console.log(\"Memory test completed successfully\");
'"

# Test CI/CD integration
echo -e "\n🔄 Testing CI/CD Integration..."

# Check if we're in a git repo
if git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Git repository detected${NC}"
    
    # Check if there are any uncommitted changes to migration tests
    if git diff --exit-code test/data-structure-refactoring.test.js test/indexeddb-migration.test.js test/migration-compatibility.test.js > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Migration test files are committed${NC}"
    else
        echo -e "${YELLOW}⚠️  Migration test files have uncommitted changes${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Not in a git repository${NC}"
fi

# Final results
echo -e "\n📊 Migration Test Results"
echo "=========================="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All migration tests passed!${NC}"
    echo "✅ Data migration is safe to deploy"
    exit 0
else
    echo -e "\n${RED}💥 Some migration tests failed!${NC}"
    echo "❌ Do not deploy until migration issues are resolved"
    exit 1
fi