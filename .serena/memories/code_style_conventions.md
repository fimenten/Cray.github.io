# Code Style and Conventions for Cray

## Language and Configuration
- **Primary Language**: TypeScript with strict mode enabled
- **Target**: ES6+ features
- **Module System**: ESNext modules for main application, CommonJS for tests
- **No Linting Tools**: No ESLint or Prettier configuration - relies on TypeScript compiler for validation

## TypeScript Configuration
- **Main Config** (`tsconfig.json`): ES modules for application code
  - Target: ES6, Module: ESNext
  - Output: `./dist`
  - Strict mode enabled
- **Test Config** (`tsconfig.cjs.json`): CommonJS for test compatibility
  - Extends main config but outputs CommonJS modules
  - Output: `./cjs`

## Naming Conventions
- **Variables and Functions**: camelCase (e.g., `generateUUID`, `getRandomColor`)
- **Classes and Interfaces**: PascalCase (e.g., `Tray`, `ITrayData`, `TrayData`)
- **Types**: PascalCase with descriptive names (e.g., `TrayId`, `PluginContext`)
- **Constants**: UPPER_CASE for module-level constants
- **Files**: camelCase for TypeScript files (e.g., `keyboardInteraction.ts`)

## Code Organization
- **Imports**: Group imports logically - utilities first, then local modules
- **Export Style**: Use named exports, avoid default exports
- **Interface Definitions**: Prefer interfaces over types for object shapes
- **Type Definitions**: Centralized in `src/types.ts`

## Architecture Patterns
- **Event-Driven**: Heavy use of DOM events for user interaction
- **WeakMap Registry**: `element2TrayMap` links DOM elements to Tray instances
- **Plugin System**: Hook-based extensibility with well-defined interfaces
- **Session-Based Storage**: IndexedDB with session ID organization
- **Redux State Management**: Redux Toolkit for global application state

## Testing Conventions
- **Unit Tests**: Use Node.js built-in test runner with CommonJS compilation
- **E2E Tests**: Playwright with TypeScript configuration
- **Test Files**: `.test.js` for unit tests, `.spec.ts` for E2E tests
- **Mock Setup**: Stub browser APIs (DOM, IndexedDB) in unit tests

## File Structure Conventions
- **Source Code**: All TypeScript source in `src/` directory
- **Tests**: Unit tests in `test/`, E2E tests in `tests/`
- **Build Output**: CommonJS in `cjs/`, webpack bundle in `dist/`
- **Configuration**: Root-level config files (webpack, tsconfig, etc.)

## Documentation Style
- **Comments**: Minimal inline comments, prefer self-documenting code
- **JSDoc**: Not extensively used, rely on TypeScript types
- **README**: Comprehensive project documentation in markdown