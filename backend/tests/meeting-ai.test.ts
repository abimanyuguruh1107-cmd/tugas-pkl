import { describe, expect, test } from "bun:test";
import { validateProposedDecisions } from "../src/services/meeting-ai/ai-decisions.service";

describe("meeting AI decision output validation", () => {
  test("accepts explicit proposals with bounded confidence", () => {
    expect(
      validateProposedDecisions([
        {
          decision: "Ship the beta",
          rationale: "Team agreed",
          confidence: 0.95,
        },
      ]),
    ).toEqual([
      { decision: "Ship the beta", rationale: "Team agreed", confidence: 0.95 },
    ]);
  });
  test("rejects malformed output and out-of-range confidence", () => {
    expect(() =>
      validateProposedDecisions([{ decision: "Invalid", confidence: 4 }]),
    ).toThrow();
    expect(() => validateProposedDecisions({ decisions: [] })).toThrow();
  });
});
