# Task Completion Checklist for Cray

## Essential Steps After Code Changes

### 1. Type Checking (Required)
```bash
tsc --noEmit
```
- **Purpose**: Verify TypeScript compilation without generating files
- **Must Pass**: Zero type errors before considering task complete
- **Fix Issues**: Address all type errors and warnings

### 2. Comprehensive Testing (Required)
```bash
npm test
```
- **Includes**: Unit tests + migration tests + E2E tests (CI mode)
- **All Tests Must Pass**: No failing tests allowed
- **Test Categories**:
  - Unit tests: Core functionality validation
  - Migration tests: Backward compatibility verification
  - E2E tests: User workflow validation

### 3. Build Verification (Recommended)
```bash
npm run build && npm run bundle
```
- **Purpose**: Ensure production build succeeds
- **Output**: Verify `dist/bundle.js` is generated correctly
- **Size Check**: Monitor bundle size for performance

### 4. Mobile Testing (When UI Changes)
```bash
npm run test:e2e:mobile
```
- **When Required**: Any UI/UX modifications
- **Devices**: Mobile Chrome, Safari, Tablet
- **Critical**: Touch interactions and responsive design

## Specific Scenarios

### Plugin System Changes
- Run plugin-specific tests: `node test/pluginSystem.test.js`
- Verify hook functionality: E2E hook tests
- Test plugin isolation and context

### Data Structure Changes
- Run migration tests: `npm run test:migration`
- Verify backward compatibility with legacy data
- Test IndexedDB schema changes

### UI/UX Changes
- Run full E2E suite: `npm run test:e2e`
- Test drag & drop functionality
- Verify keyboard navigation
- Check context menu functionality

## Performance Considerations
- Monitor build time after changes
- Check bundle size impact
- Verify lazy rendering still works
- Test with large datasets if data structures changed

## Deployment Readiness
- All tests passing ✅
- No type errors ✅
- Production build successful ✅
- No console errors in browser ✅
- Mobile compatibility verified ✅

## Never Skip
1. Type checking (`tsc --noEmit`)
2. Core test suite (`npm test`)
3. Build verification for production changes