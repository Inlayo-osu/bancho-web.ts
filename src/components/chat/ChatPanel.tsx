import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Avatar } from "@/components/Avatar";
import { api } from "@/lib/api/client";
import type { MailMessage } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { CHAT_THREADS, type ChatMessage, type ChatThread } from "@/lib/chat";

interface ChatPanelProps {
  variant?: "page" | "popover";
}

type ChatThreadWithUser = ChatThread & { userId?: number };

const STATIC_CHANNELS: ChatThread[] = CHAT_THREADS.filter((thread) => thread.type === "channel");

function mapMailMessage(message: MailMessage, meId?: number): ChatMessage {
  const sender = message.from_id === meId ? "me" : "them";
  const author = message.from_id === meId ? "You" : message.from_name || "User";

  return {
    id: `${message.id}`,
    author,
    sender,
    text: message.msg,
    time: new Date(message.time * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    read: message.read,
  };
}

export function ChatPanel({ variant = "page" }: ChatPanelProps) {
  const queryClient = useQueryClient();
  const { player } = useAuth();
  const [channelThreads, setChannelThreads] = useState<ChatThread[]>(STATIC_CHANNELS);
  const [activeThreadId, setActiveThreadId] = useState<string>(STATIC_CHANNELS[0].id);
  const [localDmMessages, setLocalDmMessages] = useState<Record<number, ChatMessage[]>>({});

  const { data: mailThreads = [] } = useQuery({
    queryKey: ["mail-threads", player?.id],
    queryFn: () => api.fetchMailThreads(),
    select: (response) => response.data,
    enabled: !!player,
    staleTime: 30_000,
  });

  const activeThread = useMemo<ChatThreadWithUser | undefined>(() => {
    const mergedThreads: ChatThreadWithUser[] = [
      ...channelThreads,
      ...mailThreads.map((thread) => ({
        id: `dm-${thread.user_id}`,
        type: "dm" as const,
        name: thread.name,
        title: thread.name,
        unread: thread.unread_count,
        userId: thread.user_id,
        messages: [],
      })),
    ];

    return mergedThreads.find((thread) => thread.id === activeThreadId) ?? mergedThreads[0];
  }, [activeThreadId, channelThreads, mailThreads]);

  const activeDmUserId = activeThread?.type === "dm" ? activeThread.userId ?? null : null;

  const { data: dmConversation = [] } = useQuery({
    queryKey: ["mail-conversation", activeDmUserId],
    queryFn: () => api.fetchMailConversation(activeDmUserId!),
    select: (response) => response.data,
    enabled: !!player && !!activeDmUserId,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!player || !activeDmUserId) return;

    api.markMailConversationAsRead(activeDmUserId).catch(() => undefined);
    queryClient.invalidateQueries({ queryKey: ["mail-threads", player.id] });
  }, [activeDmUserId, player, queryClient]);

  useEffect(() => {
    if (!activeDmUserId || !dmConversation.length) return;

    setLocalDmMessages((current) => ({
      ...current,
      [activeDmUserId]: dmConversation.map((message) => mapMailMessage(message, player?.id)),
    }));
  }, [activeDmUserId, dmConversation, player?.id]);

  const allThreads = useMemo<ChatThreadWithUser[]>(() => {
    const conversationThreads: ChatThreadWithUser[] = mailThreads.map((thread) => {
      const localMessages = localDmMessages[thread.user_id] ?? [];
      const conversationMessages =
        thread.user_id === activeDmUserId && dmConversation.length
          ? dmConversation.map((message) => mapMailMessage(message, player?.id))
          : [];

      return {
        id: `dm-${thread.user_id}`,
        type: "dm",
        name: thread.name,
        title: thread.name,
        unread: thread.unread_count,
        userId: thread.user_id,
        messages: [...conversationMessages, ...localMessages],
      };
    });

    return [...channelThreads, ...conversationThreads];
  }, [activeDmUserId, channelThreads, dmConversation, localDmMessages, mailThreads, player?.id]);

  const activeThreadResolved = useMemo<ChatThreadWithUser | undefined>(
    () => allThreads.find((thread) => thread.id === activeThreadId) ?? allThreads[0] ?? channelThreads[0],
    [activeThreadId, allThreads, channelThreads],
  );

  const unreadCount = useMemo(
    () => channelThreads.reduce((sum, thread) => sum + thread.unread, 0) + mailThreads.reduce((sum, thread) => sum + thread.unread_count, 0),
    [channelThreads, mailThreads],
  );

  function selectThread(threadId: string) {
    setActiveThreadId(threadId);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (activeThreadResolved?.type === "dm" && activeThreadResolved.userId) {
      try {
        const created = await api.sendMailMessage(activeThreadResolved.userId, trimmed);
        const message = mapMailMessage(created.data, player?.id);

        setLocalDmMessages((current) => ({
          ...current,
          [activeThreadResolved.userId]: [...(current[activeThreadResolved.userId] ?? []), message],
        }));

        await queryClient.invalidateQueries({ queryKey: ["mail-threads", player?.id] });
        return;
      } catch {
        // fall through to local-only message if sending fails to keep chat usable
      }
    }

    const nextMessage: ChatMessage = {
      id: `${Date.now()}`,
      author: "You",
      sender: "me",
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      read: true,
    };

    setChannelThreads((current) =>
      current.map((thread) =>
        thread.id === activeThreadResolved?.id
          ? {
              ...thread,
              unread: 0,
              messages: [...thread.messages, nextMessage],
            }
          : thread,
      ),
    );
  }

  if (!activeThreadResolved) {
    return null;
  }

  return (
    <div
      className={
        variant === "page"
          ? "w-full overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_12px_30px_rgba(15,23,42,0.35)]"
          : "w-[760px] overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_18px_38px_rgba(15,23,42,0.4)]"
      }
    >
      <div className="flex items-center justify-between border-b border-line bg-surface-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Chat</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-white">
              {unreadCount}
            </span>
          )}
        </div>
        <button type="button" className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-3 hover:text-slate-100">
          New message
        </button>
      </div>

      <div className="grid min-h-[540px] grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-r border-line bg-surface-2/60">
          <div className="border-b border-line px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Channels</p>
          </div>

          <ul className="space-y-1 p-2">
            {allThreads
              .filter((thread) => thread.type === "channel")
              .map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => selectThread(thread.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                    activeThreadResolved.id === thread.id
                      ? "bg-surface-3 text-slate-100"
                      : "text-muted hover:bg-surface-3 hover:text-slate-100"
                  }`}
                >
                  <span className="font-medium">{thread.name}</span>
                  {thread.unread > 0 && (
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {thread.unread}
                    </span>
                  )}
                </button>
              ))}
          </ul>

          <div className="border-b border-line px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Users</p>
          </div>

          <ul className="space-y-1 p-2">
            {allThreads
              .filter((thread) => thread.type === "dm")
              .sort((a, b) => (b.unread ?? 0) - (a.unread ?? 0))
              .map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => selectThread(thread.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors ${
                    activeThreadResolved.id === thread.id
                      ? "bg-surface-3 text-slate-100"
                      : "text-muted hover:bg-surface-3 hover:text-slate-100"
                  }`}
                >
                  <Avatar playerId={thread.userId ? (thread.userId % 10) + 1 : 1} className="h-8 w-8 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{thread.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {thread.messages.at(-1)?.author ?? "Unknown"}
                    </span>
                  </span>
                  {thread.unread > 0 && (
                    <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {thread.unread}
                    </span>
                  )}
                </button>
              ))}
          </ul>
        </aside>

        <main className="flex min-h-0 flex-col">
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar playerId={activeThreadResolved.type === "dm" ? (activeThreadResolved.userId ? (activeThreadResolved.userId % 10) + 1 : 1) : 0} className="h-9 w-9 rounded-lg border border-line bg-surface-2 object-cover" />
              <div>
                <h2 className="text-sm font-semibold text-slate-100">{activeThreadResolved.title}</h2>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
                  {activeThreadResolved.type === "channel" ? "Channel" : "Direct message"}
                </p>
              </div>
            </div>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4">
            {(activeThreadResolved.messages ?? []).map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "me" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[76%] rounded-2xl border px-3 py-2 ${
                    message.sender === "me"
                      ? "border-accent/40 bg-accent/10 text-slate-50"
                      : "border-line bg-surface text-slate-100"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted">
                    <span>{message.author}</span>
                    <span>·</span>
                    <span>{message.time}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const input = form.elements.namedItem("message") as HTMLInputElement | null;
              if (input) {
                sendMessage(input.value);
                input.value = "";
              }
            }}
            className="border-t border-line bg-surface px-4 py-3"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-line bg-canvas px-3 py-2">
              <input
                name="message"
                type="text"
                placeholder={`Message ${activeThreadResolved.title}...`}
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-muted focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-accent px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Send
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
