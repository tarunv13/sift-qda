import { setThemePreference, useThemePreference, type ThemePreference } from "../../lib/theme";
import { Icon, type IconName } from "./Icon";

const OPTIONS: { id: ThemePreference; icon: IconName; label: string }[] = [
  { id: "light", icon: "sun", label: "Light theme" },
  { id: "dark", icon: "moon", label: "Dark theme" },
  { id: "system", icon: "monitor", label: "Match Windows" },
];

/** Light / dark / match-Windows switch with a sliding indicator. */
export function ThemeToggle() {
  const preference = useThemePreference();
  const index = Math.max(0, OPTIONS.findIndex((o) => o.id === preference));

  return (
    <div role="radiogroup" aria-label="Theme" className="relative flex rounded-lg bg-line/50 p-0.5">
      <span
        aria-hidden="true"
        className="absolute top-0.5 bottom-0.5 left-0.5 w-6 rounded-md bg-surface shadow-sm transition-transform duration-200 ease-out-expo"
        style={{ transform: `translateX(${index * 100}%)` }}
      />
      {OPTIONS.map((option) => {
        const selected = option.id === preference;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.label}
            title={option.label}
            onClick={() => setThemePreference(option.id)}
            className={`relative grid h-6 w-6 place-items-center rounded-md transition-colors duration-150 ${
              selected ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            <Icon name={option.icon} size={13} />
          </button>
        );
      })}
    </div>
  );
}
