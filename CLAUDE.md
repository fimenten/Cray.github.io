# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

Cray is a hierarchical note-taking/outliner application that runs in the browser. It uses a "tray" metaphor where content is organized in nested, draggable containers. The app supports local persistence via IndexedDB, remote synchronization capabilities, and an extensible plugin system.

## Development Commands

### Core Development
```bash
# Install dependencies
npm install

# Run development server (http://localhost:9000)
npm start

# Build TypeScript to CommonJS (outputs to dist/)
npm run build

# Create production bundle
npm run bundle

# Type checking without compilation
tsc --noEmit
```

### Testing Commands
```bash
# Run all tests (unit + migration + E2E)
npm test

# Run unit tests only (Node.js test runner)
npm run test:unit

# Run migration/compatibility tests
npm run test:migration

# Run E2E tests with Playwright
npm run test:e2e:ci          # CI mode (chromium only)
npm run test:e2e             # Headed mode (all browsers)
npm run test:e2e:headless    # Headless mode
npm run test:e2e:debug       # Debug mode

# Run specific unit test
node test/[testname].test.js

# Run all unit tests manually
for f in test/*.test.js; do node "$f"; done
```

## Architecture

### Core Components

- **Tray Class** (`src/tray.ts`): Central data structure combining data model and UI component. Each tray has an id, name, children, and various properties. Handles rendering, drag/drop, and manipulation.

- **State Management**: Uses Redux Toolkit (`src/state.ts`, `src/store.ts`) for global state including focused tray, menu states, and auto-upload settings.

- **Graph Structure** (`src/graphCore.ts`): Generic utilities for tree/graph operations, used as foundation for tray hierarchy.

### Key Modules

- `src/app.ts` - Application entry point, initializes on DOM load
- `src/io.ts` - IndexedDB persistence and import/export functionality  
- `src/networks.ts` - Remote sync capabilities (upload/download)
- `src/render.ts` - Optimized rendering with lazy loading
- `src/keyboardInteraction.ts` - Keyboard navigation and shortcuts
- `src/contextMenu.ts` - Right-click context menu functionality

### Important Patterns

1. **WeakMap Registry**: `element2TrayMap` links DOM elements to Tray instances for event handling
2. **Event-Driven Architecture**: Heavy use of DOM events for user interaction
3. **Lazy Rendering**: Uses `requestIdleCallback` for performance
4. **Session-Based Storage**: IndexedDB stores data keyed by session ID
5. **Plugin System**: Extensible architecture with hooks and plugin manager for custom functionality

## Build Configuration

### TypeScript Setup
- **Dual Configuration**: Two TypeScript configs serve different purposes:
  - `tsconfig.json`: ES modules for main application (target: ES6, module: ESNext)
  - `tsconfig.cjs.json`: CommonJS for tests (enables Node.js test runner compatibility)
- **Build Process**: TypeScript → CommonJS → Webpack bundling
- **Type Checking**: Run `tsc --noEmit` for type validation without compilation

### Build Pipeline
1. **Development**: `npm start` → Webpack dev server with TypeScript compilation
2. **Production**: `npm run build` → TypeScript to CommonJS → `npm run bundle` → Webpack production bundle
3. **Output**: `dist/bundle.js` served with `index.html` from project root

## Plugin System

### Architecture
- **Plugin Manager** (`src/pluginManager.ts`): Central registry for plugins and hooks
- **Hook System**: Each tray can have hooks (strings) that trigger plugin functionality
- **Plugin Context**: Provides access to tray data, UI state, and application APIs
- **Event-Driven**: Plugins respond to tray lifecycle events and user actions

### Key Components
- **HookedTask Interface**: Defines plugin task structure with execution context
- **Plugin Types** (`src/pluginTypes.ts`): TypeScript definitions for plugin development
- **Hook Integration**: Seamlessly integrated with tray operations and UI interactions

### Development Notes
- Plugins extend core functionality without modifying base application
- Hook system enables customizable behavior per tray
- Plugin context provides safe access to application state and operations

## Testing Strategy

### Test Categories

1. **Unit Tests** (`npm run test:unit`): 
   - Use Node.js built-in test runner with CommonJS compilation
   - Test files stub browser APIs (DOM, IndexedDB) and create mock tray structures
   - Cover core functionality: utils, undo, drag/drop, notifications, etc.

2. **Migration Tests** (`npm run test:migration`):
   - Ensure backward compatibility with older data formats
   - Test IndexedDB schema migrations and data structure refactoring
   - Validate import/export functionality across versions

3. **E2E Tests** (`npm run test:e2e:ci`):
   - Playwright tests running against live application
   - Test user workflows: drag/drop, keyboard shortcuts, hook functionality
   - Configured for `http://localhost:9000` with automatic dev server startup

### Test Execution

```bash
# Run comprehensive test suite
npm test                     # All tests (unit + migration + E2E)

# Individual test categories
npm run test:unit           # Fast unit tests
npm run test:migration      # Data compatibility tests  
npm run test:e2e:ci         # E2E tests (CI configuration)

# Manual test execution
node test/utils.test.js     # Specific unit test
for f in test/*.test.js; do node "$f"; done  # All unit tests
```

### CI/CD Approach
- **Zero-cost CI/CD**: Tests run locally via pre-push hooks
- **Deployment**: GitHub Actions for automated deployment to GitHub Pages

## Data Migration & Compatibility

### Migration Strategy
- **Backward Compatibility**: Maintains support for legacy data formats through migration tests
- **Version Management**: Test fixtures include data from multiple application versions
- **Automatic Migration**: IndexedDB data automatically upgraded when application loads older formats

### Test Fixtures
- `test/fixtures/`: Contains test data from different application versions
  - `test-data-legacy.json`: Legacy format compatibility testing
  - `test-data-v1.json`, `test-data-v2.json`: Version-specific format testing
  - `test-data-current.json`: Current application format

### Migration Tests
```bash
npm run test:migration  # Runs all migration-related tests
node test/indexeddb-migration.test.js      # IndexedDB schema migrations
node test/data-structure-refactoring.test.js  # Data format migrations
node test/migration-compatibility.test.js     # Cross-version compatibility
```

### Development Notes
- When modifying data structures, add migration tests for backward compatibility
- Test fixtures should be updated to include examples of new data formats
- Migration logic should handle graceful degradation for unsupported features

## Build Process

1. TypeScript source in `src/` compiles to CommonJS via `tsc`
2. Webpack bundles the application with entry point `src/app.ts`
3. Output bundle is `dist/bundle.js`
4. HTML entry point is `index.html` in root