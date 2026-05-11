export const MOBILE_SESSION_TABS = [
  { id: "chat", label: "session.mobile.tab.chat" },
  { id: "changes", label: "session.mobile.tab.changes" },
  { id: "files", label: "session.mobile.tab.files" },
  { id: "terminal", label: "session.mobile.tab.terminal" },
] as const

export type MobileSessionTab = (typeof MOBILE_SESSION_TABS)[number]["id"]

export const DEFAULT_MOBILE_SESSION_TAB = "chat" satisfies MobileSessionTab
