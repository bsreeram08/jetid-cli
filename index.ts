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

function stringifyWithBigInt(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, currentValue) => (typeof currentValue === "bigint" ? currentValue.toString() : currentValue),
    2,
  );
}

function formatYamlScalar(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "bigint") return `"${value.toString()}"`;
  if (value === null) return "null";
  return String(value);
}

function toYaml(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return `${pad}${formatYamlScalar(value)}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    return value
      .map((item) => {
        const isScalar =
          item === null ||
          typeof item === "string" ||
          typeof item === "number" ||
          typeof item === "boolean" ||
          typeof item === "bigint";
        if (isScalar) {
          return `${pad}- ${formatYamlScalar(item)}`;
        }
        return `${pad}-\n${toYaml(item, indent + 1)}`;
      })
      .join("\n");
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return `${pad}{}`;
  return entries
    .map(([key, entryValue]) => {
      const isScalar =
        entryValue === null ||
        typeof entryValue === "string" ||
        typeof entryValue === "number" ||
        typeof entryValue === "boolean" ||
        typeof entryValue === "bigint";
      if (isScalar) {
        return `${pad}${key}: ${formatYamlScalar(entryValue)}`;
      }
      return `${pad}${key}:\n${toYaml(entryValue, indent + 1)}`;
    })
    .join("\n");
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
    format: { type: "string" },
    count: { type: "string" },
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
  --format <fmt>     Output format for --explain (table|json|yaml|list)
  --count <n>        Generate n IDs at once (generation commands only)
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
  jetid --explain --from HEX --format json 84055ede06e8b37e15
  jetid --explain --from HEX --format list 84055ede06e8b37e15,84055ede06e8b37e16
  jetid --hex '05' --count 5
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
  let generatedIds: Array<string | bigint> | undefined;
  let fromRepresentation: REPRESENTATION_TYPE = "URLSAFE";
  const explainFormat = (typeof values.format === "string" ? values.format.toLowerCase() : "table") as "table" | "json" | "yaml" | "list";
  const count = typeof values.count === "string" ? Number.parseInt(values.count, 10) : 1;
  if (!["table", "json", "yaml", "list"].includes(explainFormat)) {
    throw new Error("Invalid format. Use one of: table, json, yaml, list");
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error("count must be a positive integer");
  }

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
    generatedIds = Array.from({ length: count }, () => generateShortId(typeId as SHORTID_TYPE, options));
    idToProcess = generatedIds[0];
    isShortId = true;
  } else if (values.hex !== undefined) {
    const typeId = typeof values.hex === "string" && values.hex !== "" ? values.hex : undefined;
    generatedIds = Array.from({ length: count }, () => generateID("HEX", typeId, options));
    idToProcess = generatedIds[0];
    fromRepresentation = "HEX";
  } else if (values.decimal !== undefined) {
    const typeId = typeof values.decimal === "string" && values.decimal !== "" ? values.decimal : undefined;
    generatedIds = Array.from({ length: count }, () => generateID("DECIMAL", typeId, options));
    idToProcess = generatedIds[0];
    fromRepresentation = "DECIMAL";
  } else if (values.binary !== undefined) {
    const typeId = typeof values.binary === "string" && values.binary !== "" ? values.binary : undefined;
    generatedIds = Array.from({ length: count }, () => generateID("BINARY", typeId, options));
    idToProcess = generatedIds[0];
    fromRepresentation = "BINARY";
  } else {
    const typeId = typeof values.urlsafe === "string" && values.urlsafe !== "" ? values.urlsafe : undefined;
    generatedIds = Array.from({ length: count }, () => generateID("URLSAFE", typeId, options));
    idToProcess = generatedIds[0];
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
      const idsToExplain: Array<string | bigint> = generatedIds
        ? [...generatedIds]
        : explainFormat === "list" && typeof rawId === "string"
          ? rawId.split(",").map((id) => id.trim()).filter(Boolean).map((id) => (fromRepresentation === "DECIMAL" ? BigInt(id) : id))
          : [idToProcess];
      const entries = idsToExplain.map((currentId) => {
        const currentIsShort =
          typeof currentId === "string" && currentId.length === 9 && typeof values.from !== "string" && validateShortId(currentId);
        if (currentIsShort) {
          const details = getShortIdComponents(currentId);
          return {
            input: currentId,
            kind: "SHORT",
            isValid: details.isValid,
            timestamp: details.timestamp ? details.timestamp.toISOString() : null,
            typeIdentifier: details.typeIdentifier ?? null,
            context: details.context ?? null,
          };
        }
        const details = explainId(currentId as any, fromRepresentation);
        return {
          kind: "JETID",
          ...details,
          id: {
            ...details.id,
            decimal: details.id.decimal.toString(),
          },
          sequence: details.sequence.toString(),
        };
      });

      if (explainFormat === "json") {
        console.log(stringifyWithBigInt(entries.length === 1 ? entries[0] : entries));
      } else if (explainFormat === "yaml") {
        console.log(toYaml(entries.length === 1 ? entries[0] : entries));
      } else if (explainFormat === "list") {
        entries.forEach((entry, index) => {
          if (entry.kind === "SHORT") {
            console.log(`${index + 1}. ${entry.input} | short | valid=${entry.isValid ? "yes" : "no"} | type=${entry.typeIdentifier ?? "None"} | context=${entry.context ?? "None"}`);
          } else {
            console.log(
              `${index + 1}. ${(entry as any).id.hex} | type=${(entry as any).typeIdentifier ?? "None"} | context=${(entry as any).context ?? "None"} | ts=${(entry as any).createdTimestampReadable}`,
            );
          }
        });
      } else {
        entries.forEach((entry, index) => {
          if (entries.length > 1) {
            console.log(`\n\x1b[1m\x1b[34mEntry ${index + 1}\x1b[0m`);
          }
          if (entry.kind === "SHORT") {
            console.log(`\n\x1b[1m\x1b[34mShort ID Breakdown\x1b[0m`);
            console.log(`\x1b[90m--------------------------------\x1b[0m`);
            console.log(`\x1b[1mID:\x1b[0m              ${entry.input}`);
            console.log(`\x1b[1mValid:\x1b[0m           ${entry.isValid ? "\x1b[32mYes\x1b[0m" : "\x1b[31mNo\x1b[0m"}`);
            if (entry.isValid && entry.timestamp) {
              console.log(`\x1b[1mTimestamp:\x1b[0m       ${entry.timestamp}`);
              console.log(`\x1b[1mType Identifier:\x1b[0m ${entry.typeIdentifier || "None"}`);
              if (entry.context) console.log(`\x1b[1mContext:\x1b[0m         ${entry.context}`);
            }
          } else {
            const jetEntry = entry as any;
            console.log(`\n\x1b[1m\x1b[34mJetID Component Breakdown\x1b[0m`);
            console.log(`\x1b[90m--------------------------------\x1b[0m`);
            console.log(`\x1b[1mURL-Safe:\x1b[0m        \x1b[36m${jetEntry.id.urlsafe}\x1b[0m`);
            console.log(`\x1b[1mHex:\x1b[0m             ${jetEntry.id.hex}`);
            console.log(`\x1b[1mDecimal:\x1b[0m         ${jetEntry.id.decimal}`);
            console.log(`\x1b[1mBinary:\x1b[0m          ${jetEntry.id.binary}`);
            console.log(`\x1b[90m--------------------------------\x1b[0m`);
            console.log(`\x1b[1mTimestamp:\x1b[0m       ${jetEntry.createdTimestampReadable}`);
            console.log(`\x1b[1mClient ID:\x1b[0m       \x1b[35m${jetEntry.clientId}\x1b[0m`);
            console.log(`\x1b[1mSequence:\x1b[0m        ${jetEntry.sequence}`);
            console.log(`\x1b[1mType ID:\x1b[0m         \x1b[33m${jetEntry.typeIdentifier || "None"}\x1b[0m`);
            if (jetEntry.context) {
              console.log(`\x1b[1mContext:\x1b[0m         \x1b[32m${jetEntry.context}\x1b[0m`);
            }
          }
        });
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
      result = generatedIds ?? idToProcess;
    }
  }

  if (result !== undefined && result !== null) {
    if (Array.isArray(result)) {
      result.forEach((item) => console.log(item.toString()));
    } else {
      console.log(result.toString());
    }
  }
} catch (error) {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
