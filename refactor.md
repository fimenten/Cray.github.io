# Cray Refactoring Guidelines

## Overview
This document outlines the refactoring strategy for the Cray outliner application. The goal is to improve code quality, maintainability, and testability while preserving all existing functionality and data compatibility.

## Core Principles

### 1. Test-First Approach
- **No refactoring without tests**: Every module must have tests before modification
- **UI behavior preservation**: Playwright tests must pass before and after changes
- **Data compatibility**: All export/import formats must remain compatible

### 2. Incremental Changes
- Make small, focused changes
- Each commit should leave the app in a working state
- Run tests after each change

### 3. Backward Compatibility
- Preserve all public APIs
- Maintain data format compatibility
- Keep URL parameters and hash routing intact

## Testing Strategy

### Phase 1: Test Infrastructure Setup
1. **Playwright Setup**
   - Install Playwright with TypeScript support
   - Configure for local development server
   - Set up CI/CD integration

2. **Unit Test Framework**
   - Continue using Node.js test runner
   - Add test utilities for DOM mocking
   - Create test fixtures for tray structures

3. **IO Compatibility Tests**
   - Export current data samples
   - Create test suite for import/export
   - Test legacy format support

### Phase 2: Baseline Test Coverage
1. **Critical UI Operations**
   - Tray creation and deletion
   - Drag and drop functionality
   - Keyboard navigation
   - Context menu operations
   - Search functionality

2. **Data Operations**
   - Save/load from IndexedDB
   - Export/import JSON
   - Network sync operations

3. **State Management**
   - Redux actions and reducers
   - Focus management
   - Menu state transitions

## Refactoring Targets

### 1. Type Safety Improvements
- [ ] Add strict TypeScript configuration
- [ ] Define interfaces for all data structures
- [ ] Remove all `any` types
- [ ] Add proper error types

### 2. Architecture Improvements
- [ ] Separate UI components from business logic
- [ ] Extract rendering logic from Tray class
- [ ] Create proper event bus/messaging system
- [ ] Improve state management patterns

### 3. Code Organization
- [ ] Split large modules into smaller ones
- [ ] Group related functionality
- [ ] Standardize naming conventions
- [ ] Remove dead code

### 4. Performance Optimizations
- [ ] Optimize render cycles
- [ ] Improve lazy loading
- [ ] Add proper memoization
- [ ] Reduce DOM manipulations

## Module-Specific Guidelines

### Tray Class (`src/tray.ts`)
- Extract UI methods to separate renderer
- Create TrayData interface
- Separate event handling logic
- Add proper lifecycle methods

### State Management (`src/state.ts`, `src/store.ts`)
- Add proper TypeScript types for actions
- Implement action creators
- Add selectors for derived state
- Consider middleware for side effects

### IO Module (`src/io.ts`)
- Create versioned data formats
- Add migration utilities
- Improve error handling
- Add data validation

### Render Module (`src/render.ts`)
- Extract template functions
- Implement virtual DOM diffing
- Optimize batch updates
- Add render performance metrics

## Process Guidelines

### Before Each Refactoring Session
1. Run all tests to ensure green baseline
2. Export sample data for compatibility testing
3. Create feature branch
4. Document intended changes

### During Refactoring
1. Make one logical change at a time
2. Run tests after each change
3. Commit with descriptive messages
4. Keep refactoring separate from feature changes

### After Refactoring
1. Run full test suite
2. Test manual UI operations
3. Verify data import/export
4. Update documentation
5. Create pull request with detailed description

## Data Compatibility Rules

### Export Format
- Maintain current JSON structure
- Add version field for future migrations
- Preserve all existing fields
- Document any new optional fields

### IndexedDB Schema
- Keep existing object stores
- Version database changes properly
- Provide migration paths
- Test with existing user data

### URL Parameters
- Preserve all existing parameters
- Maintain hash routing behavior
- Document any new parameters
- Keep backward compatibility

## Code Style Guidelines

### TypeScript
```typescript
// Use interfaces for data structures
interface TrayData {
  id: string;
  name: string;
  children: string[];
  collapsed?: boolean;
}

// Use enums for constants
enum TrayAction {
  Create = 'CREATE',
  Delete = 'DELETE',
  Update = 'UPDATE'
}

// Prefer const assertions
const config = {
  maxDepth: 10,
  defaultName: 'New Tray'
} as const;
```

### Naming Conventions
- Classes: PascalCase
- Interfaces: PascalCase with 'I' prefix for services
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Files: camelCase.ts

### Error Handling
```typescript
// Define custom error types
class TrayError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'TrayError';
  }
}

// Use try-catch with specific handling
try {
  await saveTray(trayData);
} catch (error) {
  if (error instanceof TrayError) {
    handleTrayError(error);
  } else {
    handleUnexpectedError(error);
  }
}
```

## Testing Patterns

### Unit Tests
```javascript
// Group related tests
describe('Tray Operations', () => {
  test('should create new tray with default values', () => {
    const tray = new Tray();
    assert.strictEqual(tray.name, '');
    assert.strictEqual(tray.children.length, 0);
  });
});
```

### Playwright Tests
```typescript
// Test user workflows
test('create and edit tray', async ({ page }) => {
  await page.goto('http://localhost:9000');
  
  // Create new tray
  await page.click('#root');
  await page.keyboard.press('Enter');
  
  // Verify tray created
  const tray = page.locator('.tray').first();
  await expect(tray).toBeVisible();
  
  // Edit tray name
  await tray.click();
  await page.keyboard.type('Test Tray');
  
  // Verify name updated
  await expect(tray).toContainText('Test Tray');
});
```

## Refactoring Phases

### Phase 1: Test Coverage (Week 1)
- Set up Playwright
- Create UI test suite
- Add unit tests for core modules
- Establish baseline metrics

### Phase 2: Type Safety (Week 2)
- Enable strict TypeScript
- Add interfaces and types
- Remove any types
- Fix type errors

### Phase 3: Architecture (Week 3-4)
- Extract UI from Tray class
- Improve state management
- Refactor event handling
- Optimize render pipeline

### Phase 4: Code Quality (Week 5)
- Remove dead code
- Improve naming
- Add documentation
- Performance optimization

## Success Metrics

### Code Quality
- TypeScript strict mode enabled
- 0 any types
- 80%+ test coverage
- All tests passing

### Performance
- Initial render < 100ms
- Smooth drag/drop at 60fps
- Memory usage stable
- No memory leaks

### Maintainability
- Clear module boundaries
- Documented public APIs
- Consistent code style
- Easy to add features

## Risk Mitigation

### Data Loss Prevention
- Always test with copy of real data
- Implement data validation
- Add recovery mechanisms
- Keep backups of test data

### Regression Prevention
- Comprehensive test suite
- Manual testing checklist
- Staged rollout
- Quick rollback plan

### Performance Degradation
- Benchmark before changes
- Profile after changes
- Set performance budgets
- Monitor key metrics