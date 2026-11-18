import { describe, expect, test } from "bun:test";
import { searchQuerySchema } from "../src/validators/meeting.schemas";

describe("search query validation", () => {
  test("accepts bounded query and optional limit", () => {
    expect(
      searchQuerySchema.parse({ query: { q: "roadmap", limit: "10" } }),
    ).toEqual({ query: { q: "roadmap", limit: 10 } });
  });
  test("rejects missing, too-short, extra, and oversized query parameters", () => {
    expect(searchQuerySchema.safeParse({ query: {} }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ query: { q: "x" } }).success).toBe(
      false,
    );
    expect(
      searchQuerySchema.safeParse({ query: { q: "roadmap", extra: "x" } })
        .success,
    ).toBe(false);
    expect(
      searchQuerySchema.safeParse({ query: { q: "roadmap", limit: "51" } })
        .success,
    ).toBe(false);
  });
});
