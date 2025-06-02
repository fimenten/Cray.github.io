# Agent Instructions

This repository uses GitHub Actions for CI and deployment.

## Build and Test Process

When making changes to source files:

1. Run `npm test` to compile the TypeScript sources and execute unit tests. This ensures `dist/` is up to date.
2. After tests succeed, run `npm run build` to produce the final bundled assets in `dist/`.

CI workflows follow the same order: tests run before the build step.
