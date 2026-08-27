export interface PillTab<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

interface PillTabsProps<T> {
  tabs: PillTab<T>[];
  value: T;
  onChange: (value: T) => void;
  /**
  * accent: pastel indigo active tab, for primary switchers (game mode).
   * neutral: subtle active tab, for secondary switchers (sorts, tabs).
   */
  variant?: "accent" | "neutral";
  /** stretch tabs to fill the available width */
  grow?: boolean;
}

/** The standard segmented pill-tab control used across the site. */
export function PillTabs<T extends string | number>({
  tabs,
  value,
  onChange,
  variant = "neutral",
  grow = false,
}: PillTabsProps<T>) {
  const activeClass =
    variant === "accent" ? "bg-accent text-white" : "bg-surface-3 text-slate-100";

  return (
    <div className="flex rounded-xl bg-surface p-1">
      {tabs.map((tab) => (
        <button
          key={String(tab.value)}
          type="button"
          disabled={tab.disabled}
          onClick={() => onChange(tab.value)}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
            grow ? "flex-1" : ""
          } ${
            value === tab.value
              ? activeClass
              : tab.disabled
                ? "cursor-not-allowed text-muted/40"
                : "text-muted hover:text-slate-100"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
