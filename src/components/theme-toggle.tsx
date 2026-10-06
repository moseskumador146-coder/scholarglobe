"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // hydration-safe "mounted" flag (no setState-in-effect)
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const isDark = mounted ? resolvedTheme === "dark" : true;

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative h-9 w-9 overflow-hidden rounded-full border-border bg-secondary/60 transition-colors hover:bg-accent"
    >
      <Sun
        className={`absolute h-4.5 w-4.5 transition-all duration-500 ${
          isDark ? "translate-y-6 rotate-90 opacity-0" : "translate-y-0 rotate-0 opacity-100 text-amber-500"
        }`}
      />
      <Moon
        className={`absolute h-4.5 w-4.5 transition-all duration-500 ${
          isDark ? "translate-y-0 rotate-0 opacity-100 text-indigo-300" : "-translate-y-6 -rotate-90 opacity-0"
        }`}
      />
    </Button>
  );
}
