import { env } from "@/lib/env";

export function Footer() {
  return (
    <footer className="rounded-t-2xl border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted sm:flex-row">
        <span>
          {env.appName} — running on{" "}
          <a
            href="https://github.com/osuAkatsuki/bancho.py"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:text-accent-hover"
          >
            Inlayo
          </a>
          {env.discordInviteUrl && (
            <>
              {" · "}
              <a
                href={env.discordInviteUrl}
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:text-accent-hover"
              >
                Discord
              </a>
            </>
          )}
        </span>
        <span>
          osu! is a trademark of ppy Pty Ltd. This server is not affiliated
          with osu!.
        </span>
      </div>
    </footer>
  );
}

