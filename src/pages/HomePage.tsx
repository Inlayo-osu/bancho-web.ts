import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Card } from "@/components/ui/Card";
import { api } from "@/lib/api/client";
import { env } from "@/lib/env";
import { formatNumber } from "@/lib/format";
import { usePageTitle } from "@/lib/usePageTitle";

const INITIAL_CHAT_MESSAGES = [
  { id: 1, author: "System", text: "Welcome to the public lobby!", time: "now" },
  { id: 2, author: "Ari", text: "Anyone grinding mania today?", time: "just now" },
  { id: 3, author: "Kiro", text: "I’m aiming for top plays this evening.", time: "just now" },
];

export function HomePage() {
  usePageTitle("Home");

  const { data: stats } = useQuery({
    queryKey: ["server-stats"],
    queryFn: () => api.fetchServerStats(),
    refetchInterval: 60_000,
    select: (envelope) => envelope.data,
  });

  const [messages, setMessages] = useState(INITIAL_CHAT_MESSAGES);
  const [draft, setDraft] = useState("");

  function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        author: "You",
        text: trimmed,
        time: "now",
      },
    ]);
    setDraft("");
  }

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

      <section className="grid gap-4 lg:grid-cols-[1.45fr_0.95fr]">
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-muted">Live chat</p>
              <h2 className="text-base font-semibold">#lobby</h2>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-300">
              Online
            </span>
          </div>

          <div className="flex max-h-[290px] flex-col gap-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div key={message.id} className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="font-semibold text-slate-200">{message.author}</span>
                  <span>{message.time}</span>
                </div>
                <p className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-slate-100">
                  {message.text}
                </p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="border-t border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Say something..."
                className="flex-1 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm text-slate-100 placeholder:text-muted focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Send
              </button>
            </div>
          </form>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-accent">Community</p>
          <h2 className="mt-1 font-bold">Daily grind</h2>
          <p className="mt-2 text-sm text-muted">
            Check the leaderboard, jump into top plays, and use the lobby to coordinate matches or challenge runs.
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <Link to="/chat" className="block rounded-xl border border-line bg-surface-2 px-3 py-2 text-slate-100 hover:border-accent/60">
              Open chat
            </Link>
            <Link to="/topplays" className="block rounded-xl border border-line bg-surface-2 px-3 py-2 text-slate-100 hover:border-accent/60">
              Browse top plays
            </Link>
            <Link to="/leaderboard" className="block rounded-xl border border-line bg-surface-2 px-3 py-2 text-slate-100 hover:border-accent/60">
              View rankings
            </Link>
          </div>
        </Card>
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
