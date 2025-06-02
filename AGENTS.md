# AGENT Instructions

This project uses TypeScript and Node's built in test runner.

* Before running tests, compile the TypeScript sources to a CommonJS directory named `cjs`.
  Example:
  ```bash
  npm run build
  ```
* Run tests with:
  ```bash
  node --test
  ```
* Tests should use Node's `assert` module.
* Provide simple stubs for any browser APIs (such as `document`, `window` or `fetch`) when testing functions that depend on them.
* Mock network requests by replacing `global.fetch` with a stub during tests.
* Ensure each new feature or bug fix includes relevant unit tests at the function level and, when applicable, tests simulating browser rendering.
