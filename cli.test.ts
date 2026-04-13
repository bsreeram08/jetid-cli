import { test, expect } from "bun:test";
import { generateID } from "@jetit/id";

const cliEntryPoint = new URL("./index.ts", import.meta.url).pathname;

test("should generate a list of ids with --count", () => {
  const process = Bun.spawnSync({
    cmd: ["bun", cliEntryPoint, "--hex", "05", "--count", "3"],
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(process.exitCode).toBe(0);
  const output = new TextDecoder().decode(process.stdout).trim().split("\n");
  expect(output.length).toBe(3);
  output.forEach((id) => expect(id).toMatch(/^[0-9a-f]{18}$/));
});

test("should explain a single id in json format", () => {
  const hexId = generateID("HEX", "05");
  const process = Bun.spawnSync({
    cmd: ["bun", cliEntryPoint, "--explain", "--from", "HEX", "--format", "json", hexId],
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(process.exitCode).toBe(0);
  const parsed = JSON.parse(new TextDecoder().decode(process.stdout));
  expect(parsed.kind).toBe("JETID");
  expect(parsed.id.hex).toBe(hexId);
});

test("should explain a list of ids with list format", () => {
  const id1 = generateID("HEX", "05");
  const id2 = generateID("HEX", "05");
  const process = Bun.spawnSync({
    cmd: ["bun", cliEntryPoint, "--explain", "--from", "HEX", "--format", "list", `${id1},${id2}`],
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(process.exitCode).toBe(0);
  const output = new TextDecoder().decode(process.stdout);
  expect(output).toContain("1.");
  expect(output).toContain("2.");
  expect(output).toContain(id1);
  expect(output).toContain(id2);
});
