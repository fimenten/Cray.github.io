# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

Cray is a hierarchical note-taking/outliner application that runs in the browser. It uses a "tray" metaphor where content is organized in nested, draggable containers. The app supports local persistence via IndexedDB and remote synchronization capabilities.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (http://localhost:9000)
npm start

# Build TypeScript to CommonJS (outputs to dist/)
npm run build

# Create production bundle
npm run bundle

# Run tests (using Node.js test runner)
node test/[testname].test.js
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

## Testing

Tests use Node.js built-in test runner with CommonJS compilation. Test files stub browser APIs and create test tray structures to verify behavior.

```bash
# Run a specific test
node test/utils.test.js

# Run all tests (manual - no test runner script)
for f in test/*.test.js; do node "$f"; done
```

## Build Process

1. TypeScript source in `src/` compiles to CommonJS via `tsc`
2. Webpack bundles the application with entry point `src/app.ts`
3. Output bundle is `dist/bundle.js`
4. HTML entry point is `index.html` in root