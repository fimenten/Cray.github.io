# Cray - Hierarchical Note-Taking Application

A browser-based hierarchical note-taking and outliner application that uses a unique "tray" metaphor for organizing content in nested, draggable containers.

**Zero-cost CI/CD**: Testing runs locally via pre-push hooks, deployment via GitHub Actions.

🌐 **Live Demo**: https://fimenten.github.io/Cray.github.io/

## Features

- **Hierarchical Organization**: Organize notes in nested, tree-like structures
- **Drag & Drop Interface**: Intuitive drag-and-drop for reorganizing content
- **Local Persistence**: Data stored locally using IndexedDB
- **Remote Synchronization**: Upload and sync your data across devices
- **Plugin System**: Extensible architecture with plugin support
- **Keyboard Navigation**: Comprehensive keyboard shortcuts for efficient use
- **Markdown Support**: Rich text formatting with markdown
- **Context Menus**: Right-click functionality for quick actions
- **Undo/Redo**: Full history tracking with undo/redo capabilities

## Getting Started

### Prerequisites

- Node.js (version 14 or higher)
- npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/fimenten/Cray.github.io.git
cd Cray.github.io
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open your browser and navigate to `http://localhost:9000`

## Development

### Available Scripts

- `npm start` - Run development server (http://localhost:9000)
- `npm run build` - Build TypeScript to CommonJS (outputs to dist/)
- `npm run bundle` - Create production bundle
- `npm test` - Run Playwright E2E tests
- `npm run test:headless` - Run tests in headless mode

### Project Structure

```
src/
├── tray.ts              # Core Tray class - data model and UI component
├── state.ts & store.ts  # Redux state management
├── graphCore.ts         # Tree/graph operations utilities
├── app.ts               # Application entry point
├── io.ts                # IndexedDB persistence and import/export
├── networks.ts          # Remote sync capabilities
├── render.ts            # Optimized rendering with lazy loading
├── keyboardInteraction.ts # Keyboard navigation and shortcuts
└── contextMenu.ts       # Right-click context menu functionality
```

### Architecture

Cray uses a component-based architecture where each "tray" is both a data structure and UI component. Key patterns include:

- **WeakMap Registry**: Links DOM elements to Tray instances
- **Event-Driven Architecture**: Heavy use of DOM events for interaction
- **Lazy Rendering**: Uses `requestIdleCallback` for performance
- **Session-Based Storage**: IndexedDB with session-based data organization

## Testing

The project uses Playwright for end-to-end testing and Node.js built-in test runner for unit tests.

```bash
# Run E2E tests
npm test

# Run specific unit test
node test/utils.test.js
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Technology Stack

- **Frontend**: TypeScript, React, Redux Toolkit
- **Build Tools**: Webpack, TypeScript Compiler
- **Testing**: Playwright, Node.js Test Runner
- **Storage**: IndexedDB for local persistence

## Browser Support

Cray works in all modern browsers that support:
- ES6+ features
- IndexedDB
- Drag and Drop API
- requestIdleCallback

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License.

**For personal and educational use only.** Commercial use requires prior written permission.

For commercial licensing inquiries, please contact the project maintainer.

## Roadmap

- [ ] Real-time collaborative editing
- [ ] Mobile app versions
- [ ] Advanced plugin marketplace
- [ ] Enhanced markdown features
- [ ] Export to various formats
