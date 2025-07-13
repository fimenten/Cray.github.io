# Migration Testing Documentation

## Overview

Migration tests ensure data compatibility between different versions of the Tray app to prevent data loss when users upgrade.

## Test Structure

### Migration Test Files

1. **migration.test.js** - Basic data format compatibility tests
   - Tests deserialization of basic tray structures
   - Handles legacy data without optional fields
   - Validates nested tray hierarchies
   - Tests serialization round-trips

2. **indexeddb-migration.test.js** - IndexedDB storage migration tests
   - Database schema migration from v3 to v4
   - Data save/load validation
   - Corrupted data handling
   - Session isolation
   - Performance tests for large datasets

3. **version-compatibility.test.js** - Cross-version compatibility tests
   - Forward compatibility (v1 → current)
   - Legacy format handling
   - Data integrity validation
   - Error recovery mechanisms

### Test Data Fixtures

Located in `test/fixtures/`:

- **test-data-v1.json** - Version 1.0 data format (basic structure)
- **test-data-v2.json** - Version 2.0 with properties, hooks, and network features
- **test-data-legacy.json** - Legacy format with missing/malformed fields
- **test-data-current.json** - Current version with all modern features

## Running Tests

```bash
# Run all tests (unit + browser)
npm test

# Run only unit tests (excludes migration tests currently)
npm run test:unit

# Run migration tests separately (requires fixing module imports)
npm run test:migration

# Run browser tests
npm run test:browser:headless
```

## Known Issues

Migration tests currently have module resolution issues due to CommonJS/ESM incompatibility. The tests are written but excluded from the main test suite until the build system is updated.

## Future Improvements

1. Fix module resolution for migration tests
2. Add automatic migration scripts for data upgrades
3. Create version tagging system for data schemas
4. Add performance benchmarks for large data migrations
5. Implement backward compatibility tests