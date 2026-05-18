import { useState, useEffect } from "react";

export type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("kv-theme") as Theme | null;
    return stored ?? "light";
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem("kv-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return { theme, toggle };
}
