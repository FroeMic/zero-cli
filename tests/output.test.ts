import { test, expect, describe } from "bun:test";
import { unwrapResponse, formatJson } from "../src/output";

describe("unwrapResponse", () => {
  test("unwraps { body: { data: [...], total } }", () => {
    const result = unwrapResponse({ body: { data: [1, 2], total: 10 } });
    expect(result.data).toEqual([1, 2]);
    expect(result.total).toBe(10);
  });

  test("unwraps { data: [...], total }", () => {
    const result = unwrapResponse({ data: [3, 4], total: 5 });
    expect(result.data).toEqual([3, 4]);
    expect(result.total).toBe(5);
  });

  test("unwraps { data: { id, name } } (single record)", () => {
    const record = { id: "1", name: "Test" };
    const result = unwrapResponse({ data: record });
    expect(result.data).toEqual(record);
    expect(result.total).toBeUndefined();
  });

  test("passes through already-flat objects", () => {
    const obj = { id: "1", name: "Test" };
    const result = unwrapResponse(obj);
    expect(result.data).toEqual(obj);
  });

  test("passes through null/undefined", () => {
    expect(unwrapResponse(null).data).toBeNull();
    expect(unwrapResponse(undefined).data).toBeUndefined();
  });

  test("unwraps { body: { data } } without total", () => {
    const result = unwrapResponse({ body: { data: [1] } });
    expect(result.data).toEqual([1]);
    expect(result.total).toBeUndefined();
  });
});

describe("formatJson", () => {
  test("formats list response with total", () => {
    const output = formatJson({ data: [{ id: "1" }], total: 1 });
    const parsed = JSON.parse(output);
    expect(parsed.data).toEqual([{ id: "1" }]);
    expect(parsed.total).toBe(1);
  });

  test("formats single record without total wrapper", () => {
    const output = formatJson({ data: { id: "1", name: "Test" } });
    const parsed = JSON.parse(output);
    expect(parsed).toEqual({ id: "1", name: "Test" });
  });

  test("formats with indentation", () => {
    const output = formatJson({ data: { id: "1" } });
    expect(output).toContain("\n");
    expect(output).toContain("  ");
  });
});
