import { describe, expect, test } from "bun:test"
import { DEFAULT_MOBILE_SESSION_TAB, MOBILE_SESSION_TABS } from "./mobile-session-tabs"

describe("mobile session tabs", () => {
  test("defaults to chat and exposes all compact session panes", () => {
    expect(DEFAULT_MOBILE_SESSION_TAB).toBe("chat")
    expect(MOBILE_SESSION_TABS.map((tab) => tab.id)).toEqual(["chat", "changes", "files", "terminal"])
  })
})
