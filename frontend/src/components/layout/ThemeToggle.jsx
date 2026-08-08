import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/context/ThemeProvider";
import { Button } from "@/components/ui/button";

/** Self-contained — reads and flips the ThemeProvider's theme. */
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export default ThemeToggle;
