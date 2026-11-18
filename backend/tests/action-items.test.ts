import { describe, expect, test } from "bun:test";
import { ACTION_ITEM_STATUSES } from "../src/models/action-item.model";
import { actionItemStatuses } from "../src/services/action-items/action-items.service";

describe("action item statuses", () => {
  test("exposes the requested lifecycle states", () => {
    expect(ACTION_ITEM_STATUSES).toEqual([
      "open",
      "in_progress",
      "blocked",
      "completed",
      "cancelled",
    ]);
    expect(actionItemStatuses).toEqual(ACTION_ITEM_STATUSES);
  });
});
