#!/usr/bin/env bun
import { parseArgs } from "util";
import {
  generateID,
  generateShortId,
  convertIdRepresentation,
  validateId,
  validateShortId,
  explainId,
  getShortIdComponents,
  compareIds,
  getType,
  getContext,
  generateRRN,
  type SHORTID_TYPE,
  type REPRESENTATION_TYPE,
} from "@jetit/id";
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
    "check-update": { type: "boolean" },
    update: { type: "boolean" },
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
    validate: { type: "boolean" },
    explain: { type: "boolean" },
    compare: { type: "string" },
    getType: { type: "boolean" },
    getContext: { type: "boolean" },
    rrn: { type: "string" },
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
  --validate         Validate an ID
  --explain          Explain an ID components
  --compare <id2>    Compare current ID with another ID (ignoring context)
  --getType          Extract type identifier from an ID
  --getContext       Extract context field from an ID
  --rrn [stan]       Generate a Retrieval Reference Number (optional STAN)
  --check-updates    Check for a newer version on GitHub
  --update           Update jetid-cli to the latest version
  -h, --help         Show this help message
  -v, --version      Show version info

Examples:
  jetid --hex '05'
  jetid --urlsafe
  jetid --convert g6bwhyBZKFkd --from URLSAFE --to HEX
  jetid ABC123DEF --from URLSAFE --to DECIMAL
  jetid --validate g6bwhyBZKFkd
  jetid --explain g6bwhyBZKFkd
  jetid g6bwhyBZKFkd --getType
  jetid --rrn
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
      if (!silent) console.log(`Already on the latest version (v${currentVersion}).`);
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

if (values["check-updates"] || values["check-update"]) {
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
  let result: any;
  const idToConvert = (values.convert as string) || positionals[0];

  if (values.rrn !== undefined) {
    const stan = typeof values.rrn === "string" ? parseInt(values.rrn, 10) : undefined;
    result = generateRRN(stan);
  } else if (idToConvert) {
    const fromVal = typeof values.from === "string" ? values.from.toUpperCase() : "URLSAFE";
    const toVal = typeof values.to === "string" ? values.to.toUpperCase() : "HEX";
    const from = fromVal as REPRESENTATION_TYPE;
    const to = toVal as REPRESENTATION_TYPE;

    const input = from === "DECIMAL" ? BigInt(idToConvert) : idToConvert;

    if (values.validate) {
      if (typeof idToConvert === "string" && idToConvert.length === 9) {
        result = validateShortId(idToConvert);
      } else {
        const typeId = typeof values.hex === "string" || typeof values.urlsafe === "string" || typeof values.decimal === "string" || typeof values.binary === "string"
          ? (values.hex || values.urlsafe || values.decimal || values.binary) as string
          : undefined;
        result = validateId(input as any, from, typeId);
      }
    } else if (values.explain) {
      let details: any;
      if (typeof idToConvert === "string" && idToConvert.length === 9) {
        details = getShortIdComponents(idToConvert);
        console.log(`\n\x1b[1m\x1b[34mShort ID Breakdown\x1b[0m`);
        console.log(`\x1b[90m--------------------------------\x1b[0m`);
        console.log(`\x1b[1mID:\x1b[0m              ${idToConvert}`);
        console.log(`\x1b[1mValid:\x1b[0m           ${details.isValid ? "\x1b[32mYes\x1b[0m" : "\x1b[31mNo\x1b[0m"}`);
        if (details.isValid) {
          console.log(`\x1b[1mTimestamp:\x1b[0m       ${details.timestamp.toISOString()}`);
          console.log(`\x1b[1mType Identifier:\x1b[0m ${details.typeIdentifier || "None"}`);
          if (details.context) console.log(`\x1b[1mContext:\x1b[0m         ${details.context}`);
        }
      } else {
        details = explainId(input as any, from);
        console.log(`\n\x1b[1m\x1b[34mJetID Component Breakdown\x1b[0m`);
        console.log(`\x1b[90m--------------------------------\x1b[0m`);
        console.log(`\x1b[1mURL-Safe:\x1b[0m        \x1b[36m${details.id.urlsafe}\x1b[0m`);
        console.log(`\x1b[1mHex:\x1b[0m             ${details.id.hex}`);
        console.log(`\x1b[1mDecimal:\x1b[0m         ${details.id.decimal.toString()}`);
        console.log(`\x1b[90m--------------------------------\x1b[0m`);
        console.log(`\x1b[1mTimestamp:\x1b[0m       ${details.createdTimestampReadable}`);
        console.log(`\x1b[1mClient ID:\x1b[0m       \x1b[35m${details.clientId}\x1b[0m`);
        console.log(`\x1b[1mSequence:\x1b[0m        ${details.sequence.toString()}`);
        console.log(`\x1b[1mType ID:\x1b[0m         \x1b[33m${details.typeIdentifier || "None"}\x1b[0m`);
        if (details.context) {
          console.log(`\x1b[1mContext:\x1b[0m         \x1b[32m${details.context}\x1b[0m`);
        }
      }
      result = undefined;
    } else if (values.compare) {
      const id2 = values.compare as string;
      const input2 = from === "DECIMAL" ? BigInt(id2) : id2;
      result = compareIds(input as any, input2 as any, from);
    } else if (values.getType) {
      result = getType(input as any, from);
    } else if (values.getContext) {
      result = getContext(input as any, from);
    } else {
      result = convertIdRepresentation(input as any, from, to);
    }
  } else if (values.short !== undefined) {
    const typeId = typeof values.short === "string" ? values.short : undefined;
    if (!typeId) {
      throw new Error("Short ID requires a type identifier (e.g., --short '0A')");
    }
    result = generateShortId(typeId as SHORTID_TYPE, options);
  } else if (values.hex !== undefined) {
    const typeId = typeof values.hex === "string" ? values.hex : undefined;
    result = generateID("HEX", typeId, options);
  } else if (values.decimal !== undefined) {
    const typeId = typeof values.decimal === "string" ? values.decimal : undefined;
    result = generateID("DECIMAL", typeId, options);
  } else if (values.binary !== undefined) {
    const typeId = typeof values.binary === "string" ? values.binary : undefined;
    result = generateID("BINARY", typeId, options);
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
