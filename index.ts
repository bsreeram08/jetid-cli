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

/**
 * Pre-process argv so that generation flags (--hex, --urlsafe, --decimal, --binary)
 * do not greedily consume subsequent operation flags as their optional type-id value.
 * When a generation flag is immediately followed by another flag (starts with "-"),
 * we rewrite it as "--flag=" so parseArgs sees an empty string value and leaves the
 * next flag intact.
 */
function preprocessArgs(args: string[]): string[] {
  const generationFlags = new Set(["--hex", "--urlsafe", "--decimal", "--binary"]);
  const result: string[] = [];
  for (const [i, arg] of args.entries()) {
    if (generationFlags.has(arg)) {
      const next = args[i + 1];
      if (!next || next.startsWith("-")) {
        result.push(`${arg}=`);
      } else {
        result.push(arg);
      }
    } else {
      result.push(arg);
    }
  }
  return result;
}

const { values, positionals } = parseArgs({
  args: preprocessArgs(Bun.argv.slice(2)),
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
    uninstall: { type: "boolean" },
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
  --uninstall        Uninstall jetid-cli from your system
  --check-updates    Check for a newer version on GitHub
  --update           Update jetid-cli to the latest version
  -h, --help         Show this help message
  -v, --version      Show version info

Examples:
  jetid --hex '05'
  jetid --hex '05' --explain
  jetid --hex '05' --to URLSAFE
  jetid --urlsafe --validate
  jetid --urlsafe --getType
  jetid --decimal --explain
  jetid --short '0A' --explain
  jetid --convert g6bwhyBZKFkd --from URLSAFE --to HEX
  jetid ABC123DEF --from URLSAFE --to DECIMAL
  jetid --validate g6bwhyBZKFkd
  jetid --explain g6bwhyBZKFkd
  jetid g6bwhyBZKFkd --getType
  jetid --rrn
  jetid --uninstall
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
    console.log(`Already on the latest version (v${pkg.version || "1.0.0"}).`);
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

async function uninstall() {
  const exePath = process.execPath;
  if (!exePath) {
    console.error("Error: Could not determine executable path.");
    return;
  }
  if (exePath.includes("node_modules") || !exePath.includes("jetid")) {
    console.error(`Error: Cannot uninstall. Current executable path (${exePath}) does not look like a global installation.`);
    return;
  }

  console.log(`Uninstalling jetid from ${exePath}...`);
  try {
    const result = spawnSync("rm", [exePath]);
    if (result.status === 0) {
      console.log("Successfully uninstalled jetid.");
    } else {
      console.log("Permission denied. Trying with sudo...");
      const sudoResult = spawnSync("sudo", ["rm", exePath], { stdio: "inherit" });
      if (sudoResult.status === 0) {
        console.log("Successfully uninstalled jetid.");
      } else {
        throw new Error("Uninstall failed.");
      }
    }
  } catch (error) {
    console.error("Error during uninstall:", error instanceof Error ? error.message : String(error));
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

if (values.uninstall) {
  await uninstall();
  process.exit(0);
}

const options: { clientId?: string; context?: string } = {};
if (typeof values.clientId === "string") options.clientId = values.clientId;
if (typeof values.context === "string") options.context = values.context;

try {
  let result: any;
  let isShortId = false;
  let idToProcess: string | bigint | undefined;
  let fromRepresentation: REPRESENTATION_TYPE = "URLSAFE";

  const rawId = (values.convert as string | undefined) || positionals[0];

  if (values.rrn !== undefined) {
    const stan = typeof values.rrn === "string" ? parseInt(values.rrn, 10) : undefined;
    result = generateRRN(stan);
  } else if (rawId) {
    fromRepresentation = (typeof values.from === "string" ? values.from.toUpperCase() : "URLSAFE") as REPRESENTATION_TYPE;
    idToProcess = fromRepresentation === "DECIMAL" ? BigInt(rawId) : rawId;
    isShortId = rawId.length === 9 && typeof values.from !== "string" && validateShortId(rawId);
  } else if (values.short !== undefined) {
    const typeId = typeof values.short === "string" ? values.short : undefined;
    if (!typeId) {
      throw new Error("Short ID requires a type identifier (e.g., --short '0A')");
    }
    idToProcess = generateShortId(typeId as SHORTID_TYPE, options);
    isShortId = true;
  } else if (values.hex !== undefined) {
    const typeId = typeof values.hex === "string" && values.hex !== "" ? values.hex : undefined;
    idToProcess = generateID("HEX", typeId, options);
    fromRepresentation = "HEX";
  } else if (values.decimal !== undefined) {
    const typeId = typeof values.decimal === "string" && values.decimal !== "" ? values.decimal : undefined;
    idToProcess = generateID("DECIMAL", typeId, options);
    fromRepresentation = "DECIMAL";
  } else if (values.binary !== undefined) {
    const typeId = typeof values.binary === "string" && values.binary !== "" ? values.binary : undefined;
    idToProcess = generateID("BINARY", typeId, options);
    fromRepresentation = "BINARY";
  } else {
    const typeId = typeof values.urlsafe === "string" && values.urlsafe !== "" ? values.urlsafe : undefined;
    idToProcess = generateID("URLSAFE", typeId, options);
    fromRepresentation = "URLSAFE";
  }

  if (idToProcess !== undefined) {
    const toVal = (typeof values.to === "string" ? values.to.toUpperCase() : "HEX") as REPRESENTATION_TYPE;

    if (values.validate) {
      if (isShortId) {
        result = validateShortId(idToProcess as string);
      } else {
        const typeId = [values.hex, values.urlsafe, values.decimal, values.binary]
          .find((v): v is string => typeof v === "string" && v !== "");
        result = validateId(idToProcess as any, fromRepresentation, typeId);
      }
    } else if (values.explain) {
      if (isShortId) {
        const details = getShortIdComponents(idToProcess as string);
        console.log(`\n\x1b[1m\x1b[34mShort ID Breakdown\x1b[0m`);
        console.log(`\x1b[90m--------------------------------\x1b[0m`);
        console.log(`\x1b[1mID:\x1b[0m              ${idToProcess}`);
        console.log(`\x1b[1mValid:\x1b[0m           ${details.isValid ? "\x1b[32mYes\x1b[0m" : "\x1b[31mNo\x1b[0m"}`);
        if (details.isValid) {
          console.log(`\x1b[1mTimestamp:\x1b[0m       ${details.timestamp!.toISOString()}`);
          console.log(`\x1b[1mType Identifier:\x1b[0m ${details.typeIdentifier || "None"}`);
          if (details.context) console.log(`\x1b[1mContext:\x1b[0m         ${details.context}`);
        }
      } else {
        const details = explainId(idToProcess as any, fromRepresentation);
        console.log(`\n\x1b[1m\x1b[34mJetID Component Breakdown\x1b[0m`);
        console.log(`\x1b[90m--------------------------------\x1b[0m`);
        console.log(`\x1b[1mURL-Safe:\x1b[0m        \x1b[36m${details.id.urlsafe}\x1b[0m`);
        console.log(`\x1b[1mHex:\x1b[0m             ${details.id.hex}`);
        console.log(`\x1b[1mDecimal:\x1b[0m         ${details.id.decimal.toString()}`);
        console.log(`\x1b[1mBinary:\x1b[0m          ${details.id.binary}`);
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
      const input2 = fromRepresentation === "DECIMAL" ? BigInt(id2) : id2;
      result = compareIds(idToProcess as any, input2 as any, fromRepresentation);
    } else if (values.getType) {
      if (isShortId) {
        const components = getShortIdComponents(idToProcess as string);
        result = components.isValid ? (components.typeIdentifier ?? null) : null;
      } else {
        result = getType(idToProcess as any, fromRepresentation);
      }
    } else if (values.getContext) {
      if (isShortId) {
        const components = getShortIdComponents(idToProcess as string);
        result = components.isValid ? (components.context ?? null) : null;
      } else {
        result = getContext(idToProcess as any, fromRepresentation);
      }
    } else if (rawId || values.to) {
      if (isShortId) throw new Error("Short IDs cannot be converted between representations");
      result = convertIdRepresentation(idToProcess as any, fromRepresentation, toVal);
    } else {
      result = idToProcess;
    }
  }

  if (result !== undefined && result !== null) {
    console.log(result.toString());
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
