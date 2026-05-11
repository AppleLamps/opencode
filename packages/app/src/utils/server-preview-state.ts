export type ServerPreviewState = "idle" | "checking" | "reachable" | "failed"

export function serverPreviewLabel(state: ServerPreviewState, t: (key: string) => string) {
  if (state === "checking") return t("dialog.server.preview.checking")
  if (state === "reachable") return t("dialog.server.preview.reachable")
  if (state === "failed") return t("dialog.server.preview.failed")
  return t("dialog.server.preview.idle")
}

export function serverPreviewTone(state: ServerPreviewState) {
  if (state === "reachable") return "success"
  if (state === "failed") return "critical"
  if (state === "checking") return "pending"
  return "muted"
}
