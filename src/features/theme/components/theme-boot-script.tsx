const themeBootScript = `
(() => {
  try {
    const root = document.documentElement;
    const storage = window.localStorage;
    const legacy = ["dental-recovery:theme:v3", "dental-recovery:theme:v2"];
    const validModes = new Set(["light", "dark", "system"]);
    const validAccents = new Set(["red", "orange", "yellow", "green", "blue", "indigo", "violet"]);
    const systemMode = () => window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    let mode = storage.getItem("dd-theme");
    if (!validModes.has(mode)) {
      for (const key of legacy) {
        const value = storage.getItem(key);
        if (!value) continue;
        try {
          const parsed = JSON.parse(value);
          if (validModes.has(parsed?.mode)) {
            mode = parsed.mode;
            break;
          }
        } catch {
          if (validModes.has(value)) {
            mode = value;
            break;
          }
        }
      }
    }
    if (!validModes.has(mode)) mode = "dark";
    const accent = storage.getItem("dd-accent-theme");
    root.dataset.themePreference = mode;
    root.dataset.theme = mode === "system" ? systemMode() : mode;
    root.dataset.accent = validAccents.has(accent) ? accent : "green";
  } catch {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.dataset.accent = "green";
  }
})();
`;

export function ThemeBootScript() {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: themeBootScript }}
      id="dd-theme-boot"
      suppressHydrationWarning
    />
  );
}
