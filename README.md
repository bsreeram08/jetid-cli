# jetid - High-Performance ID CLI

A CLI tool to generate and convert lexically sortable, cryptographically random IDs using the `@jetit/id` library.

## Installation

To install globally:
```bash
bun install -g jetid-cli
```

Or for local development:
```bash
bun install
bun link
```

## Usage

### Generate IDs

```bash
# Generate a HEX ID with type '05'
jetid --hex '05'

# Generate a URL-safe ID (default)
jetid --urlsafe

# Generate a Short ID (9 characters)
jetid --short '0A'
```

### Convert IDs

```bash
# Convert a HEX ID to URLSAFE
jetid 83d5396608c1b00c01 --from HEX --to URLSAFE

# Convert a URLSAFE ID to DECIMAL
jetid g9U5ZgjBsAwB --from URLSAFE --to DECIMAL
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
1. Update version in `package.json`
2. Tag your commit: `git tag v1.0.1`
3. Push the tag: `git push origin v1.0.1`
4. The action will compile a standalone binary and create a GitHub release.
