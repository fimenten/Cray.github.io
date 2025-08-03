# Essential Development Commands for Cray

## Core Development Commands

### Installation & Setup
```bash
npm install                    # Install dependencies
```

### Development Server
```bash
npm start                      # Run development server (http://localhost:9000)
```

### Build Commands
```bash
npm run build                  # Build TypeScript to CommonJS (outputs to dist/)
npm run bundle                 # Create production bundle
tsc --noEmit                   # Type checking without compilation
```

## Testing Commands

### Comprehensive Testing
```bash
npm test                       # Run all tests (unit + migration + E2E)
npm run test:all               # Same as npm test
npm run test:all:mobile        # All tests including mobile E2E
```

### Unit Tests (Node.js Test Runner)
```bash
npm run test:unit              # Run all unit tests
node test/utils.test.js        # Run specific unit test
for f in test/*.test.js; do node "$f"; done  # Run all unit tests manually
```

### Migration/Compatibility Tests
```bash
npm run test:migration         # Run data migration and compatibility tests
```

### E2E Tests (Playwright)
```bash
npm run test:e2e:ci            # CI mode (chromium only)
npm run test:e2e               # Headed mode (all browsers)
npm run test:e2e:headless      # Headless mode
npm run test:e2e:debug         # Debug mode
```

### Mobile Testing
```bash
npm run test:e2e:mobile        # Mobile Chrome + Safari + Tablet
npm run test:e2e:mobile:chrome # Mobile Chrome only
npm run test:e2e:mobile:safari # Mobile Safari only
npm run test:e2e:tablet        # Tablet testing
```

## System Commands
- **Git**: Standard git commands for version control
- **File operations**: ls, cd, grep, find (Linux environment)
- **Process monitoring**: Use `watch` for monitoring GitHub Actions or other processes

## Development Workflow
1. Start development server: `npm start`
2. Make changes to TypeScript files in `src/`
3. Run type checking: `tsc --noEmit`
4. Run tests: `npm test`
5. Build for production: `npm run build && npm run bundle`