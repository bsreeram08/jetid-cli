# JetID CLI Guide

## Build & Test Commands
- **Install**: `bun install`
- **Run CLI**: `bun index.ts`
- **Run Tests**: `bun test`
- **Run Single Test**: `bun test <filename>` (e.g., `bun test index.test.ts`)
- **Type Check**: `bunx tsc --noEmit`
- **Update Dependencies**: `bun update`

## Code Style Guidelines
- **Imports**: Named imports only. `import { generateID } from "@jetit/id";`.
- **Types**: Use `import type` or `import { type ... }`.
- **Formatting**: 2 spaces, double quotes, semicolons.
- **Naming**: `camelCase` for functions/variables, `SCREAMING_SNAKE_CASE` for type unions (e.g., `SHORTID_TYPE`).
- **Architecture**: Functional/Procedural CLI logic in `index.ts`. Avoid classes.
- **Error Handling**: `try/catch` with `instanceof Error` checks. Use `process.exit(1)` for fatal CLI errors.
- **API**: Prefer Bun native APIs (`Bun.argv`, `fetch`, `Bun.spawnSync`).

## Testing
Use `bun:test` for all tests. Tests should follow the "should [action] [expected result]" naming convention.

```typescript
import { test, expect } from "bun:test";
import { generateID } from "@jetit/id";

test("should generate valid hex id", () => {
  const id = generateID("HEX", "05");
  expect(id).toMatch(/^[0-9a-f]{18}$/);
});
```
