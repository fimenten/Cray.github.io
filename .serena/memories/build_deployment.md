# Build and Deployment Configuration for Cray

## Webpack Configuration

### Development Server
- **Entry Point**: `./src/app.ts`
- **Dev Server Port**: 9000 (http://localhost:9000)
- **Static Files**: Serves from `dist/` and project root
- **Hot Reloading**: Enabled for TypeScript files
- **History API**: Fallback support for SPA routing

### Production Build
- **TypeScript Loader**: ts-loader for .ts file processing
- **Output**: `dist/bundle.js`
- **Module Resolution**: Supports .ts and .js extensions
- **Build Command**: `npm run bundle` (webpack --mode production)

## Build Process

### Development Workflow
1. **Start Dev Server**: `npm start`
   - Webpack dev server with hot reloading
   - TypeScript compilation on-the-fly
   - Static file serving from multiple directories

2. **Type Checking**: `tsc --noEmit`
   - Validates TypeScript without generating files
   - Uses main tsconfig.json (ES modules)

### Production Workflow
1. **Compile TypeScript**: `npm run build`
   - Uses tsconfig.cjs.json (CommonJS for tests)
   - Outputs to `cjs/` directory

2. **Create Bundle**: `npm run bundle`
   - Webpack production mode
   - Optimized bundle generation
   - Output: `dist/bundle.js`

## Deployment Strategy

### Zero-Cost CI/CD
- **Testing**: Local execution via pre-push hooks
- **Deployment**: GitHub Actions for automated deployment
- **Hosting**: GitHub Pages (free static hosting)
- **URL**: https://fimenten.github.io/Cray.github.io/

### Git Repository Structure
- **Built Bundle**: `dist/bundle.js` committed to repo (see .gitignore exception)
- **Source Maps**: Not included in production for size optimization
- **Static Assets**: HTML, CSS, and images in project root

## File Structure

### Build Outputs
```
dist/
├── bundle.js          # Production webpack bundle (committed)
└── [other assets]     # Generated during build

cjs/                   # CommonJS compilation output
├── [TypeScript files] # Compiled for Node.js test runner
```

### Static Assets
```
index.html             # Main HTML entry point
logo.svg              # Application logo
src/styles.css        # Application styles
```

## Environment Configuration

### Development
- **Node.js**: Version 14 or higher required
- **npm**: Package management and script runner
- **Browser**: Modern browser with ES6+ support

### Production Requirements
- **Browser Support**: ES6+, IndexedDB, Drag & Drop API, requestIdleCallback
- **Network**: HTTPS required for certain features
- **Storage**: IndexedDB for local persistence

## Performance Optimizations

### Build Optimizations
- **Webpack Production Mode**: Automatic minification and tree shaking
- **TypeScript Compilation**: Optimized ES6 output
- **Bundle Analysis**: Monitor bundle size impact

### Runtime Optimizations
- **Lazy Loading**: Implemented at application level
- **Code Splitting**: Single bundle approach for simplicity
- **Asset Optimization**: Minimal external dependencies

## Deployment Process

### Manual Deployment
1. Run full test suite: `npm test`
2. Build production bundle: `npm run bundle`
3. Commit changes including `dist/bundle.js`
4. Push to GitHub (triggers GitHub Actions)

### Automated Deployment
- **GitHub Actions**: Configured for automatic deployment
- **Branch**: Deploys from main/master branch
- **Static Files**: Deployed to GitHub Pages
- **Cache Invalidation**: Handled by GitHub Pages

## Monitoring and Maintenance
- **Bundle Size**: Monitor via build logs
- **Performance**: Browser dev tools and user feedback
- **Error Tracking**: Console logs and user reports
- **Compatibility**: Cross-browser testing with Playwright