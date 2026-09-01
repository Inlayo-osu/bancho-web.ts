import { Link, NavLink } from "react-router-dom";

import { PlayerSearch } from "@/components/PlayerSearch";
import { UserMenu } from "@/components/layout/UserMenu";
import { env } from "@/lib/env";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/leaderboard", label: "Leaderboard" },
  /* { to: "/topplays", label: "Top Plays" }, */
];

export function Navbar() {
  return (
    // the sticky wrapper paints canvas behind the rounded corners so
    // scrolling content never peeks through the notches
    <div className="sticky top-0 z-40 bg-canvas">
      <header className="rounded-b-2xl border-b border-line bg-surface">
        <div className="overflow-x-auto overscroll-x-contain">
          <div className="mx-auto flex h-14 min-w-max w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
            <Link to="/" className="flex shrink-0 items-center gap-2.5">
              <span className="text-[15px] font-semibold tracking-tight">
                {env.appName}
              </span>
            </Link>

            <nav className="flex shrink-0 items-center gap-1">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-surface-2 text-slate-100"
                        : "text-muted hover:text-slate-100"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <div className="ml-auto flex shrink-0 items-center gap-3">
              <div className="w-64 max-w-xs">
                <PlayerSearch />
              </div>

              <div className="flex items-center gap-2">
                <UserMenu />
              </div>
            </div>
          </div>
        </div>
      </header>

    </div>
  );
}
