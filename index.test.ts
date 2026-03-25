import { test, expect } from "bun:test";
import {
  generateID,
  generateShortId,
  convertIdRepresentation,
  validateId,
  validateShortId,
  explainId,
  getShortIdComponents,
  getType,
  getContext,
} from "@jetit/id";

test("should generate valid hex id", () => {
  const id = generateID("HEX", "05");
  expect(id).toMatch(/^[0-9a-f]{18}$/);
  expect(id.endsWith("05")).toBe(true);
});

test("should generate valid urlsafe id", () => {
  const id = generateID("URLSAFE");
  expect(id.length).toBeGreaterThan(10);
});

test("should validate a generated hex id", () => {
  const id = generateID("HEX", "05");
  expect(validateId(id, "HEX", "05")).toBe(true);
});

test("should validate a generated urlsafe id", () => {
  const id = generateID("URLSAFE");
  expect(validateId(id, "URLSAFE")).toBe(true);
});

test("should validate a generated decimal id", () => {
  const id = generateID("DECIMAL");
  expect(validateId(id as any, "DECIMAL")).toBe(true);
});

test("should validate a generated binary id", () => {
  const id = generateID("BINARY");
  expect(validateId(id, "BINARY")).toBe(true);
});

test("should explain a generated hex id and return all representations", () => {
  const id = generateID("HEX", "05");
  const details = explainId(id, "HEX");
  expect(details.id.hex).toBe(id);
  expect(details.id.urlsafe).toBeTruthy();
  expect(details.id.binary).toBeTruthy();
  expect(typeof details.id.decimal).toBe("bigint");
  expect(details.typeIdentifier).toBe("05");
});

test("should explain a generated urlsafe id", () => {
  const id = generateID("URLSAFE");
  const details = explainId(id, "URLSAFE");
  expect(details.id.urlsafe).toBe(id);
  expect(details.id.hex).toBeTruthy();
});

test("should explain a generated binary id", () => {
  const id = generateID("BINARY");
  const details = explainId(id, "BINARY");
  expect(details.id.binary).toBe(id);
  expect(details.id.urlsafe).toBeTruthy();
});

test("should convert generated hex id to urlsafe", () => {
  const hexId = generateID("HEX", "05");
  const urlsafeId = convertIdRepresentation(hexId, "HEX", "URLSAFE");
  expect(urlsafeId.length).toBeGreaterThan(5);
  // round-trip: converting back should give the same hex id
  const backToHex = convertIdRepresentation(urlsafeId, "URLSAFE", "HEX");
  expect(backToHex).toBe(hexId);
});

test("should convert generated urlsafe id to hex", () => {
  const urlsafeId = generateID("URLSAFE");
  const hexId = convertIdRepresentation(urlsafeId, "URLSAFE", "HEX");
  expect(hexId).toMatch(/^[0-9a-f]+$/);
});

test("should convert generated hex id to decimal", () => {
  const hexId = generateID("HEX");
  const decimalId = convertIdRepresentation(hexId, "HEX", "DECIMAL");
  expect(typeof decimalId).toBe("bigint");
});

test("should convert generated hex id to binary", () => {
  const hexId = generateID("HEX");
  const binaryId = convertIdRepresentation(hexId, "HEX", "BINARY");
  expect(binaryId).toMatch(/^[01]+$/);
});

test("should get type from generated hex id with type identifier", () => {
  const id = generateID("HEX", "05");
  expect(getType(id, "HEX")).toBe("05");
});

test("should return null for getType on id without type identifier", () => {
  const id = generateID("HEX");
  expect(getType(id, "HEX")).toBeNull();
});

test("should return null for getContext on id without context", () => {
  const id = generateID("URLSAFE");
  expect(getContext(id, "URLSAFE")).toBeNull();
});

test("should generate and validate a short id", () => {
  const id = generateShortId("0A");
  expect(id.length).toBe(9);
  expect(validateShortId(id)).toBe(true);
});

test("should explain a generated short id", () => {
  const id = generateShortId("0A");
  const components = getShortIdComponents(id);
  expect(components.isValid).toBe(true);
  if (components.isValid) {
    expect(components.typeIdentifier).toBeTruthy();
    expect(components.timestamp).toBeInstanceOf(Date);
  }
});

test("should get type from short id components", () => {
  const id = generateShortId("0A");
  const components = getShortIdComponents(id);
  expect(components.isValid).toBe(true);
  if (components.isValid) {
    expect(components.typeIdentifier).toBe("0A");
  }
});

test("should round-trip convert between all representations", () => {
  const original = generateID("URLSAFE");
  const hex = convertIdRepresentation(original, "URLSAFE", "HEX");
  const decimal = convertIdRepresentation(original, "URLSAFE", "DECIMAL");
  const binary = convertIdRepresentation(original, "URLSAFE", "BINARY");

  expect(convertIdRepresentation(hex, "HEX", "URLSAFE")).toBe(original);
  expect(convertIdRepresentation(decimal, "DECIMAL", "URLSAFE")).toBe(original);
  expect(convertIdRepresentation(binary, "BINARY", "URLSAFE")).toBe(original);
});
