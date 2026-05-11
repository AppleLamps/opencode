import { describe, expect, test } from "bun:test"
import { filterSettingsSections, type SettingsSection } from "./settings-filter"

const sections: SettingsSection[] = [
  { id: "general", label: "General", terms: ["language", "shell"] },
  { id: "appearance", label: "Appearance", terms: ["theme", "font"] },
  { id: "updates", label: "Updates", terms: ["release notes"] },
]

describe("filterSettingsSections", () => {
  test("returns all sections for an empty query", () => {
    expect(filterSettingsSections(sections, "").map((section) => section.id)).toEqual([
      "general",
      "appearance",
      "updates",
    ])
  })

  test("matches labels and terms", () => {
    expect(filterSettingsSections(sections, "font").map((section) => section.id)).toEqual(["appearance"])
    expect(filterSettingsSections(sections, "update").map((section) => section.id)).toEqual(["updates"])
  })
})
