export const designSystemTokens = {
  colorRoles: [
    "studio-bg",
    "studio-sidebar",
    "studio-panel",
    "studio-panel-soft",
    "studio-elevated",
    "studio-ink",
    "studio-muted",
    "studio-line",
    "studio-accent-blue",
    "status-green",
    "status-amber",
    "status-red",
  ],
  spacingScale: ["4px", "8px", "10px", "14px", "16px", "22px"],
  radiusScale: ["10px", "12px", "14px", "999px"],
  shadowScale: ["none", "0 18px 60px rgba(0, 0, 0, 0.34)"],
  typography: {
    display: "24px-28px",
    heading: "14px-16px",
    body: "14px",
    caption: "12px-13px",
    eyebrow: "11px uppercase, 0.07em letter spacing",
  },
  motion: {
    enter: "none for core console surfaces",
    hover: "background-only, no lift",
  },
} as const;

export const designSystemBasics = [
  {
    title: "Surfaces",
    detail: "Panels use flat dark surfaces, subtle dividers, and no decorative elevation.",
  },
  {
    title: "Hierarchy",
    detail: "Compact page titles, muted labels, and row-first tables keep the product data-first.",
  },
  {
    title: "Status language",
    detail: "Muted green, amber, red, blue, and grey status colors are visible without shouting.",
  },
  {
    title: "Density",
    detail: "Cards, tables, rails, and inspectors share a tighter 8-16px rhythm for an AI console feel.",
  },
];
