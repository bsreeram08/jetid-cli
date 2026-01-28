# Agent Guidelines: jetid-cli

You are an agentic coding assistant working on `jetid-cli`, a high-performance ID generation and conversion tool.

## Build and Development

This project uses **Bun** as the primary runtime and package manager.

- **Runtime**: Always use `bun` (e.g., `bun index.ts`).
- **Install Dependencies**: `bun install`
- **Run Tests**: `bun test`
- **Run Specific Test**: `bun test <filename>` (e.g., `bun test index.test.ts`)
- **Linting**: No explicit linter configured, but follow strict TypeScript rules.
- **Type Check**: `bunx tsc --noEmit`

## Code Style & Conventions

### 1. Language & Runtime
- **TypeScript**: ESM only (`"type": "module"` in `package.json`).
- **Runtime**: Target Bun environments. Use Bun APIs (`Bun.argv`, `fetch`, etc.) where appropriate.
- **Shebang**: Files intended for CLI execution must start with `#!/usr/bin/env bun`.

### 2. Architecture & Patterns
- **Functional/Procedural**: The core CLI (`index.ts`) is a procedural script. Avoid unnecessary classes or complex OOP patterns.
- **CLI Parsing**: Uses Node.js `util.parseArgs`. Stick to this for consistency.
- **Small Footprint**: Keep dependencies minimal. The primary logic should reside in `@jetit/id`.

### 3. Naming Conventions
- **Functions/Variables**: `camelCase` (e.g., `checkUpdates`, `idToConvert`).
- **Constants**: `camelCase` for objects, `SCREAMING_SNAKE_CASE` for truly global constants or type unions.
- **Files**: `kebab-case.ts` or `index.ts`.

### 4. Imports & Exports
- **Named Imports**: Always prefer named imports.
  ```typescript
  import { generateID } from "@jetit/id";
  ```
- **Type Imports**: Use `import type` or `import { type ... }`.
- **Extensions**: Do not use `.ts` extensions in imports unless required by the specific build tool (not needed here).

### 5. Error Handling
- **Type-Safe Catch**: Always check if error is an instance of `Error`.
  ```typescript
  try { ... } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : String(error));
  }
  ```
- **CLI Exits**: Use `process.exit(1)` for fatal errors after logging a clear message.
- **Early Returns**: Use early returns/exits to keep code flat.

### 6. Type Safety
- **Strict Mode**: `strict: true` is enabled. No `@ts-ignore` or `as any` unless absolutely necessary for dynamic CLI logic.
- **Type Guards**: Use `typeof` checks for CLI arguments.

### 7. Formatting
- **Indentation**: 2 spaces.
- **Semicolons**: Always use semicolons.
- **Quotes**: Double quotes (`"`) for strings.

### 8. Testing
- **Framework**: `bun:test`.
- **Naming**: Tests should use descriptive strings starting with "should".
  ```typescript
  test("should generate valid hex id", () => { ... });
  ```

## Automated Rules (from .cursor/rules)
*(No specific .cursorrules found in this repository. Follow the general guidelines above.)*
