"use client";

import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  setPreferredAccentTheme,
  useCurrentAccentTheme,
  type AccentTheme,
} from "@/features/theme/theme-store";

const accentThemes: Array<{ color: string; label: string; value: AccentTheme }> = [
  { value: "red", label: "Red theme", color: "#ef4444" },
  { value: "orange", label: "Orange theme", color: "#f97316" },
  { value: "yellow", label: "Yellow theme", color: "#facc15" },
  { value: "green", label: "Green theme", color: "#22c55e" },
  { value: "blue", label: "Blue theme", color: "#3b82f6" },
  { value: "indigo", label: "Indigo theme", color: "#6366f1" },
  { value: "violet", label: "Violet theme", color: "#a855f7" },
];

export function ThemeColorPicker({ className = "" }: { className?: string }) {
  const accent = useCurrentAccentTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", closeOnOutsideClick);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("mousedown", closeOnOutsideClick);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className={`ddr-theme-color-picker ${className}`} ref={rootRef}>
      <button
        aria-expanded={open}
        aria-label="Choose page theme"
        className="ddr-icon-button ddr-theme-color-trigger"
        onClick={() => setOpen((current) => !current)}
        title="Choose page theme"
        type="button"
      >
        <Palette aria-hidden="true" size={16} />
      </button>

      {open ? (
        <div className="ddr-theme-color-menu" role="menu">
          {accentThemes.map((theme) => {
            const active = theme.value === accent;

            return (
              <button
                aria-checked={active}
                className="ddr-theme-swatch-row"
                key={theme.value}
                onClick={() => {
                  setPreferredAccentTheme(theme.value);
                  setOpen(false);
                }}
                role="menuitemradio"
                type="button"
              >
                <span className="ddr-theme-swatch" style={{ background: theme.color }} />
                <span>{theme.label.replace(" theme", "")}</span>
                {active ? <Check aria-hidden="true" size={14} /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
