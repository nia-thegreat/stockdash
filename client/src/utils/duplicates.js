// Deterministic duplicate detection: normalize a part name so casing, extra
// spacing, and word order all compare equal ("Brake Fluid" ≈ "FLUID   BRAKE").
export function normalizePartName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .split(' ')
    .sort()
    .join(' ');
}