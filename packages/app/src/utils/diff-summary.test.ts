import { describe, expect, test } from "bun:test"
import type { SnapshotFileDiff } from "@opencode-ai/sdk/v2"
import { diffSummary } from "./diff-summary"

const diff = (status: SnapshotFileDiff["status"]) =>
  ({
    file: `${status}.ts`,
    patch: "",
    additions: status === "deleted" ? 0 : 1,
    deletions: status === "added" ? 0 : 1,
    status,
  }) satisfies SnapshotFileDiff

describe("diffSummary", () => {
  test("counts changed file states", () => {
    expect(diffSummary([diff("added"), diff("deleted"), diff("modified"), diff("modified")])).toEqual({
      total: 4,
      added: 1,
      deleted: 1,
      modified: 2,
    })
  })
})
