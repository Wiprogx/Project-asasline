"use client";

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

// The server does not know the theme: until the client mounts, the button shows "system".
const noop = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

const ORDER = ["light", "dark", "system"] as const;
type Mode = (typeof ORDER)[number];
const LABEL: Record<Mode, string> = { light: "Light", dark: "Dark", system: "System" };

/** Cycles light → dark → system. The name says the current mode, so a screen reader hears it. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const mode: Mode = mounted && ORDER.includes(theme as Mode) ? (theme as Mode) : "system";
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  const Icon = mode === "light" ? SunIcon : mode === "dark" ? MoonIcon : MonitorIcon;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${LABEL[mode]}. Switch to ${LABEL[next].toLowerCase()}`}
      title={`Theme: ${LABEL[mode]}`}
    >
      <Icon aria-hidden />
    </Button>
  );
}
