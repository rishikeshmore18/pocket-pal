import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, defaultTheme = "dark" }: ThemeProviderProps) {
  // Initialize with default theme, will be updated from localStorage in useEffect
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load theme from localStorage after mount (only once)
    let storedTheme: Theme | null = null;
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "dark" || stored === "light") {
        storedTheme = stored as Theme;
      }
    } catch (error) {
      // localStorage might not be available, use default
      // Silently fail - this is expected in some environments
    }
    
    // Apply initial theme to document
    const root = window.document.documentElement;
    const initialTheme = storedTheme || defaultTheme;
    root.classList.remove("light", "dark");
    root.classList.add(initialTheme);
    
    if (storedTheme) {
      setThemeState(storedTheme);
    }
    setIsInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    if (!isInitialized) return;
    
    // Update theme class when theme changes (after initialization)
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    
    try {
      localStorage.setItem("theme", theme);
    } catch (error) {
      // Silently fail - localStorage might not be available
    }
  }, [theme, isInitialized]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
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
