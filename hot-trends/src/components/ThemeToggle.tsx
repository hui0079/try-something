"use client";

const THEME_STORAGE_KEY = "hot-trends-theme";

export function ThemeToggle() {
  const toggleTheme = () => {
    const current =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const next = current === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
  };

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label="切换白天或黑夜模式"
      onClick={toggleTheme}
    >
      <span className="theme-to-dark" aria-hidden="true">
        <span>☾</span>
        黑夜
      </span>
      <span className="theme-to-light" aria-hidden="true">
        <span>☀</span>
        白天
      </span>
    </button>
  );
}
