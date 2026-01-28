# jetid - High-Performance ID CLI

A powerful, architecture-aware CLI tool to generate and convert lexically sortable, cryptographically random IDs using the [`@jetit/id`](https://github.com/jetit/id) library.

## About

`jetid` is a high-performance command-line utility for managing distributed, unique identifiers. It leverages the `@jetit/id` library to produce IDs that are better suited for modern distributed architectures than standard UUIDs.

### Why use `jetid`?

*   **Chronological Sorting**: Unlike UUID v4, `jetid` IDs are k-sortable, meaning they maintain chronological order when sorted lexicographically. This significantly improves database indexing performance.
*   **Type Safety**: Every ID can be tagged with a 2-character hex type (e.g., `01` for users, `02` for orders). This allows your application logic to verify that an ID belongs to the correct entity type without a database lookup.
*   **Small Footprint**: At ~12-15 characters (URL-safe), these IDs are much smaller than the 36-character UUID string, saving storage and bandwidth.
*   **Collision Resistance**: Uses a combination of high-resolution timestamps, client identifiers, and sequence numbers to ensure uniqueness across distributed nodes.
*   **Integrity Checks**: Includes a 4-bit checksum, allowing the CLI and your apps to detect corrupted or malformed IDs immediately.

## ID Structure

A standard 80-bit `jetid` (URL-safe) consists of:
- **Timestamp (32 bits)**: Second-level precision with a custom epoch.
- **Client ID (20 bits)**: Up to 1 million unique generators.
- **Sequence (7 bits)**: Prevents collisions within the same millisecond.
- **Checksum (4 bits)**: For integrity validation.
- **Context (8 bits)**: Optional metadata or sharding info.
- **Type Identifier (8 bits)**: Domain-specific entity tagging.

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
