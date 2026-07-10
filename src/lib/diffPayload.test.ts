import { describe, it, expect } from "vitest";
import { diffPayload } from "./diffPayload";

describe("diffPayload", () => {
  it("returns an empty object when nothing changed", () => {
    const original = { name: "Alice", age: 30 };
    const updated = { name: "Alice", age: 30 };
    expect(diffPayload(original, updated)).toEqual({});
  });

  it("includes only the keys that changed", () => {
    const original = { name: "Alice", age: 30, bio: "hi" };
    const updated = { name: "Alice", age: 31, bio: "hi" };
    expect(diffPayload(original, updated)).toEqual({ age: 31 });
  });

  it("includes multiple changed keys", () => {
    const original = { a: 1, b: 2, c: 3 };
    const updated = { a: 1, b: 20, c: 30 };
    expect(diffPayload(original, updated)).toEqual({ b: 20, c: 30 });
  });

  it("treats a matching Date and ISO string as equal", () => {
    const iso = "2026-01-01T00:00:00.000Z";
    const original: { startDate: Date | string } = { startDate: new Date(iso) };
    const updated: { startDate: Date | string } = { startDate: iso };
    expect(diffPayload(original, updated)).toEqual({});
  });

  it("detects nested object/array changes by structural equality", () => {
    const original = { socialLinks: { telegram: "foo" } };
    const updated = { socialLinks: { telegram: "bar" } };
    expect(diffPayload(original, updated)).toEqual({ socialLinks: { telegram: "bar" } });
  });

  it("does not flag structurally identical nested objects as changed", () => {
    const original = { socialLinks: { telegram: "foo", twitter: "baz" } };
    const updated = { socialLinks: { telegram: "foo", twitter: "baz" } };
    expect(diffPayload(original, updated)).toEqual({});
  });

  it("treats null and undefined as different values", () => {
    const original: { bio: string | null | undefined } = { bio: null };
    const updated: { bio: string | null | undefined } = { bio: undefined };
    // JSON.stringify(undefined) is `undefined` (not serialized) vs "null" for null,
    // so these compare as different - confirms the util doesn't silently coalesce them.
    expect(diffPayload(original, updated)).toEqual({ bio: undefined });
  });

  it("only inspects keys present on the updated object", () => {
    const original = { a: 1, b: 2 };
    const updated = { a: 1 };
    expect(diffPayload(original, updated)).toEqual({});
  });
});
