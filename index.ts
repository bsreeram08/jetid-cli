#!/usr/bin/env bun
import { parseArgs } from "util";
import { generateID, generateShortId, convertIdRepresentation, type SHORTID_TYPE, type REPRESENTATION_TYPE } from "@jetit/id";
import { spawnSync } from "child_process";
import pkg from "./package.json";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    hex: { type: "string" },
    urlsafe: { type: "string" },
    decimal: { type: "string" },
    binary: { type: "string" },
    short: { type: "string" },
    clientId: { type: "string" },
    context: { type: "string" },
    convert: { type: "string" },
    from: { type: "string" },
    to: { type: "string" },
    "check-updates": { type: "boolean" },
    update: { type: "boolean" },
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
  },
  strict: false,
  allowPositionals: true,
});

if (values.help) {
  console.log(`
jetid - Generate and convert high-performance IDs using @jetit/id

Usage:
  jetid [options] [id-to-convert]

Options:
  --hex [type]       Generate HEX ID (optional type identifier)
  --urlsafe [type]   Generate URL-safe ID (optional type identifier)
  --decimal [type]   Generate Decimal ID (optional type identifier)
  --binary [type]    Generate Binary ID (optional type identifier)
  --short <type>     Generate Short ID (required type identifier)
  --clientId <id>    Provide custom client ID
  --context <ctx>    Provide 8-bit context field (hex byte 00-FF)
  --convert <id>     ID to convert (can also be a positional argument)
  --from <rep>       Source representation (HEX, URLSAFE, DECIMAL, BINARY)
  --to <rep>         Target representation (HEX, URLSAFE, DECIMAL, BINARY)
  --check-updates    Check for a newer version on GitHub
  --update           Update jetid-cli to the latest version
  -h, --help         Show this help message
  -v, --version      Show version info

Examples:
  jetid --hex '05'
  jetid --urlsafe
  jetid --convert g6bwhyBZKFkd --from URLSAFE --to HEX
  jetid ABC123DEF --from URLSAFE --to DECIMAL
`);
  process.exit(0);
}

if (values.version) {
  console.log(`jetid v${pkg.version || "1.0.0"}`);
  process.exit(0);
}

async function checkUpdates(silent = false) {
  try {
    const response = await fetch("https://api.github.com/repos/bsreeram08/jetid-cli/releases/latest", {
      headers: { "User-Agent": "jetid-cli" },
    });
    if (!response.ok) throw new Error("Failed to fetch latest release");
    const data = (await response.json()) as { tag_name: string };
    const latestVersion = data.tag_name.replace(/^v/, "");
    const currentVersion = pkg.version || "1.0.0";

    if (latestVersion !== currentVersion) {
      if (!silent) {
        console.log(`Update available: v${currentVersion} -> v${latestVersion}`);
        console.log(`Run 'jetid --update' to update automatically.`);
      }
      return latestVersion;
    } else {
      if (!silent) console.log("You are on the latest version.");
      return null;
    }
  } catch (error) {
    if (!silent) console.error("Error checking for updates:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function update() {
  const latest = await checkUpdates(true);
  if (!latest) {
    console.log("Already on the latest version.");
    return;
  }

  console.log(`Updating to v${latest}...`);
  try {
    const result = spawnSync("sh", ["-c", "curl -fsSL https://raw.githubusercontent.com/bsreeram08/jetid-cli/main/install.sh | bash"], { stdio: "inherit" });
    if (result.status === 0) {
      console.log("Successfully updated to the latest version!");
    } else {
      throw new Error("Update failed. Try running the installation command manually.");
    }
  } catch (error) {
    console.error("Error during update:", error instanceof Error ? error.message : String(error));
  }
}

if (values["check-updates"]) {
  await checkUpdates();
  process.exit(0);
}

if (values.update) {
  await update();
  process.exit(0);
}

const options: { clientId?: string; context?: string } = {};
if (typeof values.clientId === "string") options.clientId = values.clientId;
if (typeof values.context === "string") options.context = values.context;

try {
  let result: string | bigint | undefined;
  const idToConvert = (values.convert as string) || positionals[0];

  if (idToConvert) {
    const fromVal = typeof values.from === "string" ? values.from.toUpperCase() : "URLSAFE";
    const toVal = typeof values.to === "string" ? values.to.toUpperCase() : "HEX";
    const from = fromVal as REPRESENTATION_TYPE;
    const to = toVal as REPRESENTATION_TYPE;
    
    const input = from === "DECIMAL" ? BigInt(idToConvert) : idToConvert;
    result = convertIdRepresentation(input as any, from, to);
  } else if (values.short !== undefined) {
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

  if (result !== undefined) {
    console.log(result.toString());
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
