# Cray Architecture Overview

## Core Architecture Principles

### Dual TypeScript Configuration
- **Main Application** (`tsconfig.json`): ES modules for modern browser compatibility
  - Target: ES6, Module: ESNext
  - Output: `./dist` directory
- **Testing** (`tsconfig.cjs.json`): CommonJS for Node.js test runner compatibility
  - Extends main config but outputs CommonJS modules
  - Output: `./cjs` directory

## Core Components

### Central Data Structure
- **Tray Class** (`src/tray.ts`): Primary component combining data model and UI
  - Each tray has: id, name, children, properties (priority, tags, metadata)
  - Handles rendering, drag/drop operations, and manipulation
  - Supports plugin hooks and extensibility

### State Management
- **Redux Toolkit** (`src/state.ts`, `src/store.ts`): Global application state
  - Focused tray tracking
  - Menu states and UI preferences
  - Auto-upload settings and network configuration

### Graph Operations
- **Graph Core** (`src/graphCore.ts`): Generic tree/graph utilities
  - Foundation for tray hierarchy operations
  - Traversal, manipulation, and query functions

## Key Architectural Patterns

### Event-Driven Architecture
- Heavy reliance on DOM events for user interaction
- Event bubbling and delegation for performance
- Custom event system for plugin communication

### WeakMap Registry
- **`element2TrayMap`**: Links DOM elements to Tray instances
- Enables efficient event handling without memory leaks
- Critical for drag/drop and context menu functionality

### Lazy Rendering System
- **`requestIdleCallback`**: Performance optimization for large hierarchies
- Incremental rendering to maintain UI responsiveness
- Smart visibility detection for off-screen elements

### Session-Based Storage
- **IndexedDB**: Local persistence with session-based organization
- Multiple sessions supported via URL parameters
- Automatic data migration between versions

## Plugin Architecture

### Plugin System Components
- **Plugin Manager** (`src/pluginManager.ts`): Central registry and lifecycle management
- **Hook System**: String-based hooks trigger plugin functionality
- **Plugin Context**: Safe access to tray data and application APIs
- **Sandboxing**: Isolated execution environment for plugins

### Plugin Integration
- Hooks integrated into tray lifecycle events
- Event-driven plugin activation
- Type-safe plugin development with TypeScript interfaces

## Key Modules

### Data Layer
- **`src/io.ts`**: IndexedDB persistence and import/export functionality
- **`src/networks.ts`**: Remote synchronization capabilities
- **`src/serialization.ts`**: Data serialization and deserialization
- **`src/migration.ts`**: Backward compatibility and data migration

### UI Layer
- **`src/render.ts`**: Optimized rendering with lazy loading
- **`src/contextMenu.ts`**: Right-click context menu functionality
- **`src/keyboardInteraction.ts`**: Keyboard navigation and shortcuts
- **`src/hamburger.ts`**: Application menu and bulk operations

### Business Logic
- **`src/trayOperations.ts`**: Core tray manipulation functions
- **`src/functions.ts`**: Utility functions for tray operations
- **`src/utils.ts`**: General utility functions

## Testing Architecture

### Multi-Layered Testing Strategy
1. **Unit Tests**: Node.js test runner with DOM/IndexedDB stubs
2. **Migration Tests**: Backward compatibility validation
3. **E2E Tests**: Playwright for full user workflow testing

### Test Environment Setup
- **Browser API Mocking**: Stub DOM, IndexedDB, and window objects for unit tests
- **Session Isolation**: Unique session IDs prevent test interference
- **Cross-Browser Testing**: Support for Chrome, Firefox, Safari, mobile devices

## Build Pipeline

### Development Workflow
1. **TypeScript Compilation**: Source → ES modules or CommonJS
2. **Webpack Bundling**: Module bundling with dev server
3. **Hot Reloading**: Development server with live updates

### Production Build
1. **TypeScript → CommonJS**: `npm run build`
2. **Webpack Production Bundle**: `npm run bundle`
3. **Static Asset Generation**: Single HTML + JS bundle
4. **GitHub Pages Deployment**: Zero-cost hosting

## Performance Considerations
- **Lazy Loading**: Components rendered on-demand
- **Event Delegation**: Minimal event listeners
- **Memory Management**: WeakMap prevents memory leaks
- **Bundle Optimization**: Webpack production optimizations