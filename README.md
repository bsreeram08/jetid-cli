# jetid - High-Performance ID CLI

A CLI tool to generate and convert lexically sortable, cryptographically random IDs using the `@jetit/id` library.

## Installation

```bash
bun install
```

## Usage

### Generate IDs

```bash
# Generate a HEX ID with type '05'
bun index.ts --hex '05'

# Generate a URL-safe ID (default)
bun index.ts --urlsafe

# Generate a Short ID (9 characters)
bun index.ts --short '0A'
```

### Convert IDs

```bash
# Convert a HEX ID to URLSAFE
bun index.ts 83d5396608c1b00c01 --from HEX --to URLSAFE

# Convert a URLSAFE ID to DECIMAL
bun index.ts g9U5ZgjBsAwB --from URLSAFE --to DECIMAL
```

### Options

- `--clientId <id>`: Provide custom client ID (1-3 chars for long IDs)
- `--context <ctx>`: Provide 8-bit context field (hex byte 00-FF)
- `--check-updates`: Check for a newer version on GitHub

## Development

Run tests:
```bash
bun test
```

## Build and Release

The project includes a GitHub Action for automated builds and releases. To trigger a release:
1. Tag your commit: `git tag v1.0.0`
2. Push the tag: `git push origin v1.0.0`
3. The action will compile a standalone binary and create a GitHub release.
