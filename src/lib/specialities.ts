export const SPECIALITIES = [
  { value: "GENERALISTE",   label: "Généraliste" },
  { value: "CARDIOLOGUE",   label: "Cardiologue" },
  { value: "DERMATOLOGUE",  label: "Dermatologue" },
  { value: "PEDIATRE",      label: "Pédiatre" },
  { value: "GYNECOLOGUE",   label: "Gynécologue" },
  { value: "OPHTALMOLOGUE", label: "Ophtalmologue" },
  { value: "PSYCHIATRE",    label: "Psychiatre" },
  { value: "NEUROLOGUE",    label: "Neurologue" },
  { value: "ORTHOPEDIE",    label: "Orthopédiste" },
  { value: "AUTRE",         label: "Autre" },
] as const

export type SpecialityValue = typeof SPECIALITIES[number]["value"]

export const SPECIALITY_LABELS: Record<string, string> = Object.fromEntries(
  SPECIALITIES.map(s => [s.value, s.label])
)
