import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(undefined);
const STORAGE_KEY = "gots_theme";

/**
 * Product default is dark ("Command" theme). Light mode exists for
 * accessibility/preference but every design decision assumes dark-first.
 */
export function ThemeProvider({ children, defaultTheme = "dark" }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(STORAGE_KEY) || defaultTheme
  );

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    root.classList.add(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
