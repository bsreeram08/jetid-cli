import { test, expect } from "bun:test";
import { generateID } from "@jetit/id";

test("should generate valid hex id", () => {
  const id = generateID("HEX", "05");
  expect(id).toMatch(/^[0-9a-f]{18}$/);
  expect(id.endsWith("05")).toBe(true);
});

test("should generate valid urlsafe id", () => {
  const id = generateID("URLSAFE");
  expect(id.length).toBeGreaterThan(10);
});
