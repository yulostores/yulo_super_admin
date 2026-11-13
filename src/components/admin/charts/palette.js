// Chart colours — the dataviz skill's validated default palette (the same as yulo_seller's
// charts), checked against the white card surface: slots 1–2 pass every check (CVD ΔE 24.7,
// normal-vision ΔE 33.6, ≥ 3:1 contrast). Recharts takes colours as props, so plain strings.
export const SERIES = {
  issued: "#2a78d6", // slot 1 — blue
  redeemed: "#eb6834", // slot 2 — orange
};
// One-hue magnitude (categories, sellers, gender, age bands): blue.
export const MAGNITUDE = "#2a78d6";
export const GRID = "#EEE7E1"; // hairline, one step off the surface
export const AXIS_TEXT = "#6B5E54";
