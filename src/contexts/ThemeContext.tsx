import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    // Check localStorage first, then system preference
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") {
        return saved;
      }
    } catch {
      // Fall back to system preference if localStorage fails
    }

    // Check system preference
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    return "light";
  });

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Save to localStorage
    try {
      localStorage.setItem("theme", theme);
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error);
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't manually set a preference
      try {
        const saved = localStorage.getItem("theme");
        if (!saved) {
          setTheme(e.matches ? "dark" : "light");
        }
      } catch {
        // If localStorage fails, update anyway
        setTheme(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
