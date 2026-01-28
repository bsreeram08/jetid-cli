# jetid - High-Performance ID CLI

A powerful, architecture-aware CLI tool to generate and convert lexically sortable, cryptographically random IDs using the [`@jetit/id`](https://github.com/jetit/id) library.

## About

`jetid` is designed for distributed systems that require unique, verifiable, and sortable identifiers. Unlike standard UUIDs, `jetid` identifiers are:
- **Lexically Sortable**: Chronologically ordered by default.
- **Type-Aware**: Includes a 2-character type identifier to prevent domain cross-contamination.
- **Compact**: Significantly shorter than UUIDs while maintaining collision resistance.
- **Verifiable**: Built-in checksum to validate ID integrity without database lookups.
- **Contextual**: Optional 8-bit context field for sharding or metadata.

This CLI provides a convenient way to integrate these IDs into your shell scripts, CI/CD pipelines, or manual debugging workflows.

## Features

- **Multi-Platform**: Native binaries for Linux, macOS, and Windows (x64 & ARM64).
- **Fast**: Built with Bun for near-instant execution.
- **Self-Updating**: Built-in update mechanism to stay current with the latest features.
- **Zero Dependencies**: Single standalone binary for your architecture.

## Installation

Install the pre-compiled binary for your architecture:
```bash
curl -fsSL https://raw.githubusercontent.com/bsreeram08/jetid-cli/main/install.sh | bash
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
- `--update`: Update to the latest version automatically

## Development

Run tests:
```bash
bun test
```

## Build and Release

The project includes a GitHub Action for automated multi-arch builds. To trigger a release:
1. Update version in `package.json`
2. Tag your commit: `git tag vX.X.X`
3. Push the tag: `git push origin vX.X.X`

## License

MIT © [Sreeram](https://github.com/bsreeram08)
