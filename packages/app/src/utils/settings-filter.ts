export type SettingsSection = {
  id: string
  label: string
  terms: string[]
}

export function filterSettingsSections(sections: SettingsSection[], query: string) {
  const value = query.trim().toLowerCase()
  if (!value) return sections
  return sections.filter((section) =>
    [section.label, ...section.terms].some((item) => item.toLowerCase().includes(value)),
  )
}
