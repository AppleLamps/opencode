import { describe, expect, test } from "bun:test"
import { serverPreviewLabel, serverPreviewTone, type ServerPreviewState } from "./server-preview-state"

const t = (key: string) => key

describe("server preview state", () => {
  test("maps preview states to labels and tones", () => {
    const states: ServerPreviewState[] = ["idle", "checking", "reachable", "failed"]

    expect(states.map((state) => serverPreviewLabel(state, t))).toEqual([
      "dialog.server.preview.idle",
      "dialog.server.preview.checking",
      "dialog.server.preview.reachable",
      "dialog.server.preview.failed",
    ])
    expect(states.map(serverPreviewTone)).toEqual(["muted", "pending", "success", "critical"])
  })
})
