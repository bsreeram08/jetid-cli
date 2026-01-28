#!/usr/bin/env bun
import { parseArgs } from "util";
import { generateID, generateShortId, type SHORTID_TYPE } from "@jetit/id";
import pkg from "./package.json";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    hex: { type: "string" },
    urlsafe: { type: "string" },
    decimal: { type: "string" },
    binary: { type: "string" },
    short: { type: "string" },
    clientId: { type: "string" },
    context: { type: "string" },
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
  },
  strict: false,
});

if (values.help) {
  console.log(`
jetid - Generate high-performance IDs using @jetit/id

Usage:
  jetid [options]

Options:
  --hex [type]      Generate HEX ID (optional type identifier)
  --urlsafe [type]  Generate URL-safe ID (optional type identifier)
  --decimal [type]  Generate Decimal ID (optional type identifier)
  --binary [type]   Generate Binary ID (optional type identifier)
  --short <type>    Generate Short ID (required type identifier)
  --clientId <id>   Provide custom client ID
  --context <ctx>   Provide 8-bit context field (hex byte 00-FF)
  -h, --help        Show this help message
  -v, --version     Show version info

Examples:
  jetid --hex '05'
  jetid --urlsafe
  jetid --short '0A' --clientId 'F'
`);
  process.exit(0);
}

if (values.version) {
  console.log(`jetid v${pkg.version || "1.0.0"}`);
  process.exit(0);
}

const options: { clientId?: string; context?: string } = {};
if (typeof values.clientId === "string") options.clientId = values.clientId;
if (typeof values.context === "string") options.context = values.context;

try {
  let result: string | bigint;

  if (values.short !== undefined) {
    result = generateShortId(values.short as SHORTID_TYPE, options);
  } else if (values.hex !== undefined) {
    result = generateID("HEX", values.hex as string, options);
  } else if (values.decimal !== undefined) {
    result = generateID("DECIMAL", values.decimal as string, options);
  } else if (values.binary !== undefined) {
    result = generateID("BINARY", values.binary as string, options);
  } else {
    const typeId = typeof values.urlsafe === "string" ? values.urlsafe : undefined;
    result = generateID("URLSAFE", typeId, options);
  }

  console.log(result.toString());
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
