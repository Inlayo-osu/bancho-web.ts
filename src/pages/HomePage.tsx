import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api/client";
import { env } from "@/lib/env";
import { formatNumber } from "@/lib/format";
import { usePageTitle } from "@/lib/usePageTitle";

export function HomePage() {
  usePageTitle("Home");

  const { data: stats } = useQuery({
    queryKey: ["server-stats"],
    queryFn: () => api.fetchServerStats(),
    refetchInterval: 60_000,
    select: (envelope) => envelope.data,
  });

  return (
    <div className="space-y-6">
      {/* hero */}
      <section className="relative overflow-hidden rounded-2xl border border-line bg-surface px-6 py-14 text-center sm:px-12">
        <video
          aria-hidden
          autoPlay
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
          loop
          muted
          playsInline
          preload="metadata"
          src={env.homeVideoUrl}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-slate-950/65"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
        />
        <h1 className="relative z-10 text-4xl font-semibold tracking-tight sm:text-[2.75rem]">
          Welcome to <span className="text-accent">{env.appName}</span>
        </h1>
        <p className="relative z-10 mx-auto mt-4 max-w-xl text-muted">
          A private osu! server with global leaderboards for vanilla, relax
          and autopilot — jump in and start setting scores.
        </p>

        <div className="relative z-10 mt-8 flex items-center justify-center gap-3">
          <Link
            to="/register"
            className="rounded-xl bg-accent px-6 py-2.5 font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Get started
          </Link>
          <Link
            to="/leaderboard?mode=0&rx=0"
            className="rounded-xl border border-line bg-surface-2 px-6 py-2.5 font-semibold transition-colors hover:bg-surface-3"
          >
            Leaderboards
          </Link>
        </div>

        <div className="relative z-10 mt-10 flex items-center justify-center gap-8 text-sm">
          <Link to="/users?online=1" className="transition-opacity hover:opacity-90">
            <div>
              <p className="text-xl font-semibold text-accent">
                {stats ? formatNumber(stats.online_players) : "—"}
              </p>
              <p className="text-muted">players online</p>
            </div>
          </Link>
          <div className="h-10 w-px bg-line" />
          <Link to="/users" className="transition-opacity hover:opacity-90">
            <div>
              <p className="text-xl font-semibold">
                {stats ? formatNumber(stats.total_players) : "—"}
              </p>
              <p className="text-muted">registered players</p>
            </div>
          </Link>
        </div>
      </section>

      <section className="w-full overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_18px_38px_rgba(15,23,42,0.35)]">
        <div className="border-b border-line px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Community</p>
        </div>
        <ChatPanel variant="page" />
      </section>

      {/* how to connect */}
      <section id="how-to-connect" className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-accent">Step 1</p>
          <h2 className="mt-1 font-bold">Install osu!</h2>
          <p className="mt-2 text-sm text-muted">
            Download and install the game client from{" "}
            <a
              href="https://osu.ppy.sh/home/download"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:text-accent-hover"
            >
              osu.ppy.sh
            </a>{" "}
            if you don't have it already.
          </p>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-accent">Step 2</p>
          <h2 className="mt-1 font-bold">Point it at the server</h2>
          <p className="mt-2 text-sm text-muted">
            Download{" "}
            <a
              href="https://assets.inlayo.com/patcher/Inlayo-patcher.exe"
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:text-accent-hover"
            >
              Inlayo-patcher
            </a>{" "}
            and open!
          </p>
          <code className="mt-3 block overflow-x-auto rounded-lg bg-canvas px-3 py-2 text-xs text-slate-200">
            https://assets.inlayo.com/patcher/Inlayo-patcher.exe
          </code>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-accent">Step 3</p>
          <h2 className="mt-1 font-bold">Create an account</h2>
          <p className="mt-2 text-sm text-muted">
            <Link
              to="/register"
              className="text-accent hover:text-accent-hover"
            >
              Register here
            </Link>{" "}
            on the website, then sign in with the same credentials in the
            game client.
          </p>
        </Card>
      </section>
    </div>
  );
}
