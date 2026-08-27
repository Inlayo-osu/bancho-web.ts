import type { Meta, StoryObj } from "@storybook/react";

/**
 * The brand theme: a near-black neutral palette with a pastel indigo accent
 * (and a violet secondary used sparingly in gradients). Tokens are
 * defined in `tailwind.config.js` and used via utility classes; this
 * page documents them for reference.
 */
const COLORS = [
  { name: "canvas", className: "bg-canvas", usage: "page background" },
  { name: "surface", className: "bg-surface", usage: "cards, navbar, controls" },
  { name: "surface-2", className: "bg-surface-2", usage: "inputs, hover states, nested surfaces" },
  { name: "surface-3", className: "bg-surface-3", usage: "active states, placeholders" },
  { name: "line", className: "bg-line", usage: "borders & dividers" },
  { name: "muted", className: "bg-muted", usage: "secondary text" },
  { name: "accent", className: "bg-accent", usage: "brand, links, emphasis, primary buttons" },
  { name: "accent-hover", className: "bg-accent-hover", usage: "accent hover states" },
  { name: "accent-2", className: "bg-accent-2", usage: "secondary hue, gradients only" },
];

const SPACING = [
  { token: "gap-2 / p-2 (8px)", usage: "tight inline groups (badges, icons)" },
  { token: "gap-3 / p-3 (12px)", usage: "row internals, compact controls" },
  { token: "gap-4 / p-4 (16px)", usage: "between related items in a section" },
  { token: "px-5 py-4 (20/16px)", usage: "standard card padding (Card default)" },
  { token: "space-y-6 (24px)", usage: "between page sections" },
];

function ThemeShowcase() {
  return (
    <div className="max-w-2xl space-y-10">
      <section>
        <h2 className="mb-4 text-lg font-bold">Colors</h2>
        <ul className="space-y-2">
          {COLORS.map((color) => (
            <li key={color.name} className="flex items-center gap-4">
              <span
                className={`h-10 w-24 shrink-0 rounded-lg border border-line ${color.className}`}
              />
              <div>
                <p className="text-sm font-semibold">{color.name}</p>
                <p className="text-xs text-muted">{color.usage}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold">Type scale</h2>
        <div className="space-y-3 rounded-2xl border border-line bg-surface px-6 py-5">
          <p className="text-xl font-semibold tracking-tight">Page title (xl semibold)</p>
          <p className="text-base font-semibold">Section heading (base semibold)</p>
          <p className="text-sm">Body text (sm)</p>
          <p className="text-sm text-muted">Secondary text (sm muted)</p>
          <p className="text-xs uppercase tracking-wide text-muted">
            Label (xs uppercase muted)
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold">Spacing conventions</h2>
        <ul className="space-y-2">
          {SPACING.map((entry) => (
            <li
              key={entry.token}
              className="flex items-baseline justify-between gap-6 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm"
            >
              <code className="text-accent">{entry.token}</code>
              <span className="text-right text-muted">{entry.usage}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold">Radii</h2>
        <div className="flex gap-4">
          <div className="rounded-lg border border-line bg-surface px-4 py-3 text-sm">
            rounded-lg (8px) — buttons, inputs
          </div>
          <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm">
            rounded-xl (10px) — rows, pills
          </div>
          <div className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
            rounded-2xl (12px) — cards
          </div>
        </div>
      </section>
    </div>
  );
}

const meta: Meta<typeof ThemeShowcase> = {
  title: "Design/Theme",
  component: ThemeShowcase,
};
export default meta;

export const Theme: StoryObj<typeof ThemeShowcase> = {};
