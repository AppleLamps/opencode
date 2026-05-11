import type { SnapshotFileDiff, VcsFileDiff } from "@opencode-ai/sdk/v2"

type Diff = SnapshotFileDiff | VcsFileDiff

export type DiffSummary = {
  total: number
  added: number
  deleted: number
  modified: number
}

export function diffSummary(input: Diff[]): DiffSummary {
  return input.reduce(
    (acc, item) => {
      acc.total += 1
      if (item.status === "added") acc.added += 1
      else if (item.status === "deleted") acc.deleted += 1
      else acc.modified += 1
      return acc
    },
    { total: 0, added: 0, deleted: 0, modified: 0 },
  )
}
