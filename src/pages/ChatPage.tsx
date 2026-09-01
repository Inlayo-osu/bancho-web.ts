import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { Avatar } from "@/components/Avatar";
import { api } from "@/lib/api/client";
import type { ChatMessage, MailMessage } from "@/lib/api/types";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/lib/usePageTitle";

function formatChannelLabel(name: string) {
  return name.startsWith("#") ? name : `#${name}`;
}

function renderChatText(text: string) {
  const urlPattern = /(https?:\/\/[^\s<>"]+)/g;
  const parts = text.split(urlPattern);

  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return (
        <a
          key={`link-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer noopener"
          className="text-accent hover:text-accent-hover underline underline-offset-2"
        >
          {part}
        </a>
      );
    }
    return part ? <span key={`text-${index}`}>{part}</span> : null;
  });
}

export function ChatPage() {
  usePageTitle("Chat");
  const { player } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedChannel, setSelectedChannel] = useState<string>("#lobby");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [localChannelMessages, setLocalChannelMessages] = useState<Record<string, ChatMessage[]>>({});
  const [localDmMessages, setLocalDmMessages] = useState<Record<number, MailMessage[]>>({});

  const targetUserId = Number(searchParams.get("userId") ?? "");

  useEffect(() => {
    if (Number.isFinite(targetUserId) && targetUserId > 0) {
      setSelectedUserId(targetUserId);
      return;
    }
    setSelectedUserId(null);
  }, [targetUserId]);

  const { data: channels = [], isPending: channelsPending } = useQuery({
    queryKey: ["chat-channels"],
    queryFn: () => api.fetchChatChannels(),
    select: (response) => response.data,
  });

  const selectableChannels = useMemo(
    () => [...channels].filter((channel) => channel.name !== "#announce").sort((a, b) => a.id - b.id),
    [channels],
  );

  const { data: mailThreads = [], isPending: mailPending } = useQuery({
    queryKey: ["mail-threads", player?.id],
    queryFn: () => api.fetchMailThreads(),
    select: (response) => response.data,
    enabled: !!player,
  });

  const sortedDMThreads = useMemo(
    () => [...mailThreads]
      .filter((thread) => thread.user_id !== player?.id)
      .sort((a, b) => b.unread_count - a.unread_count),
    [mailThreads, player?.id],
  );

  useEffect(() => {
    if (!selectableChannels.length) return;
    const hasSelected = selectedChannel && selectableChannels.some((channel) => channel.name === selectedChannel);
    if (!hasSelected) {
      setSelectedChannel(selectableChannels[0]?.name || "#lobby");
    }
  }, [selectedChannel, selectableChannels]);

  const { data: messages = [], isPending: messagesPending } = useQuery({
    queryKey: ["chat-channel-messages", selectedChannel],
    queryFn: () => api.fetchChatChannelMessages(selectedChannel),
    select: (response) => response.data,
    enabled: !!selectedChannel && selectedUserId === null,
  });

  const { data: dmMessages = [], isPending: dmMessagesPending } = useQuery({
    queryKey: ["mail-conversation", selectedUserId],
    queryFn: () => api.fetchMailConversation(selectedUserId!),
    select: (response) => response.data,
    enabled: !!player && selectedUserId !== null,
  });

  useEffect(() => {
    if (!player || selectedUserId === null) return;
    api.markMailConversationAsRead(selectedUserId).catch(() => undefined);
    setSearchParams((current) => {
      current.set("userId", String(selectedUserId));
      return current;
    }, { replace: true });
  }, [player, selectedUserId, setSearchParams]);

  const activeChannel = selectableChannels.find((channel) => channel.name === selectedChannel) || selectableChannels[0];
  const activeDmThread = sortedDMThreads.find((thread) => thread.user_id === selectedUserId);

  const combinedDmMessages = selectedUserId !== null
    ? [...dmMessages, ...(localDmMessages[selectedUserId] ?? [])]
    : [];
  const combinedChannelMessages = selectedChannel
    ? [...messages, ...(localChannelMessages[selectedChannel] ?? [])]
    : messages;

  const activeMessages = selectedUserId !== null ? combinedDmMessages : combinedChannelMessages;
  const activePending = selectedUserId !== null ? dmMessagesPending : messagesPending;

  async function handleSendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || trimmed.length > 500) return;

    if (selectedUserId !== null) {
      if (!player) return;
      try {
        const created = await api.sendMailMessage(selectedUserId, trimmed);
        setLocalDmMessages((current) => ({
          ...current,
          [selectedUserId]: [...(current[selectedUserId] ?? []), created.data],
        }));
      } catch {
        setLocalDmMessages((current) => ({
          ...current,
          [selectedUserId]: [
            ...(current[selectedUserId] ?? []),
            {
              id: Date.now(),
              from_id: player.id,
              to_id: selectedUserId,
              msg: trimmed,
              time: Math.floor(Date.now() / 1000),
              read: true,
              from_name: player.name,
              to_name: activeDmThread?.name ?? "User",
            },
          ],
        }));
      }
      setDraft("");
      return;
    }

    if (!activeChannel || activeChannel.name === "#announce") {
      setDraft("");
      return;
    }

    const nextMessage: ChatMessage = {
      id: Date.now(),
      channel: selectedChannel,
      author: player?.name ?? "You",
      text: trimmed,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setLocalChannelMessages((current) => ({
      ...current,
      [selectedChannel]: [...(current[selectedChannel] ?? []), nextMessage],
    }));
    setDraft("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chat"
        description="Server channels and public chat history."
      />

      <div className="overflow-hidden rounded-[28px] border border-line bg-surface shadow-[0_18px_38px_rgba(15,23,42,0.35)]">
        <div className="grid min-h-[620px] grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-r border-line bg-surface-2/60">
            <div className="border-b border-line px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Channels</p>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {channelsPending ? (
                <div className="px-3 py-2 text-sm text-muted">Loading channels...</div>
              ) : (
                selectableChannels.map((channel) => (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(null);
                      setSelectedChannel(channel.name);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                      selectedUserId === null && activeChannel?.name === channel.name
                        ? "bg-surface-3 text-slate-100"
                        : "text-muted hover:bg-surface-3 hover:text-slate-100"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 font-medium">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-surface-2 text-[10px] font-bold text-muted">
                        #
                      </span>
                      {formatChannelLabel(channel.name)}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-muted">#{channel.id}</span>
                  </button>
                ))
              )}
            </div>

            <div className="border-b border-line px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Messages</p>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {mailPending ? (
                <div className="px-3 py-2 text-sm text-muted">Loading messages...</div>
              ) : sortedDMThreads.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted">No direct messages yet.</div>
              ) : (
                sortedDMThreads.map((thread) => (
                  <button
                    key={thread.user_id}
                    type="button"
                    onClick={() => {
                      setSelectedUserId(thread.user_id);
                      setShowNewConversation(false);
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-colors ${
                      selectedUserId === thread.user_id
                        ? "bg-surface-3 text-slate-100"
                        : "text-muted hover:bg-surface-3 hover:text-slate-100"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Avatar
                        playerId={thread.user_id}
                        className="h-7 w-7 rounded border border-line bg-surface-2 object-cover flex-shrink-0"
                      />
                      <span className="truncate font-medium">{thread.name}</span>
                    </div>
                    {thread.unread_count > 0 && (
                      <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white flex-shrink-0">
                        {thread.unread_count}
                      </span>
                    )}
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={() => setShowNewConversation(!showNewConversation)}
                className="w-full rounded-xl px-3 py-2 text-left text-sm text-accent hover:bg-surface-3 transition-colors"
              >
                + New conversation
              </button>
              {showNewConversation && (
                <div className="space-y-2 rounded-xl border border-line bg-surface-2/40 p-3">
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Username..."
                    className="w-full rounded-lg border border-line bg-canvas px-2 py-1.5 text-sm text-slate-100 placeholder:text-muted focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newUserName.trim()) return;
                      try {
                        const user = await api.fetchPlayer(newUserName);
                        setSelectedUserId(user.data.id);
                        setNewUserName("");
                        setShowNewConversation(false);
                      } catch {
                        // Handle error - could show toast
                      }
                    }}
                    disabled={!newUserName.trim()}
                    className="w-full rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    Start
                  </button>
                </div>
              )}
            </div>
          </aside>

          <main className="flex min-h-0 flex-col">
            {selectedUserId !== null && activeDmThread ? (
              <>
                <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                    DM
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">{activeDmThread.name}</h2>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Direct message</p>
                  </div>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4">
                  {activePending ? (
                    <div className="text-sm text-muted">Loading messages...</div>
                  ) : activeMessages.length === 0 ? (
                    <div className="text-sm text-muted">No messages yet.</div>
                  ) : (
                    activeMessages.map((message) => {
                      const isDm = "from_id" in message;
                      const senderName = isDm ? message.from_name : message.author;
                      const senderId = isDm ? message.from_id : undefined;
                      const rawText = isDm ? message.msg : message.text;
                      const messageText = rawText.replace(/^\u0001ACTION\s+/i, "");
                      const messageTime = isDm
                        ? new Date(message.time * 1000).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : message.time;
                      const isMine = isDm
                        ? message.from_id === player?.id
                        : message.author === player?.name;

                      return (
                        <div
                          key={`${isDm ? `dm-${message.id}` : `${message.channel}-${message.id}`}`}
                          className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          {!isMine && senderId && (
                            <Avatar
                              playerId={senderId}
                              className="h-7 w-7 rounded border border-line bg-surface-2 object-cover flex-shrink-0"
                            />
                          )}
                          <div
                            className={`max-w-[78%] rounded-2xl border px-3 py-2 ${
                              isMine
                                ? "border-accent/40 bg-accent/10 text-slate-50"
                                : "border-line bg-surface text-slate-100"
                            }`}
                          >
                            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted">
                              <span>{senderName}</span>
                              <span>·</span>
                              <span>{messageTime}</span>
                            </div>
                            <div className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
                              {renderChatText(messageText)}
                            </div>
                          </div>
                          {isMine && player && (
                            <Avatar
                              playerId={player.id}
                              className="h-7 w-7 rounded border border-line bg-surface-2 object-cover flex-shrink-0"
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="border-t border-line bg-surface px-4 py-3">
                  <div className="flex flex-col gap-2 rounded-2xl border border-line bg-canvas px-3 py-2">
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value.slice(0, 500))}
                      maxLength={500}
                      placeholder={selectedUserId !== null ? "Write a message..." : `Message ${formatChannelLabel(activeChannel?.name || "#lobby")}...`}
                      className="w-full bg-transparent text-sm text-slate-100 placeholder:text-muted focus:outline-none"
                    />
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-muted">
                      <span>{draft.length}/500</span>
                      <button
                        type="submit"
                        disabled={!draft.trim()}
                        className="rounded-xl bg-accent px-3 py-1.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : activeChannel ? (
              <>
                <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                    #
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-100">{formatChannelLabel(activeChannel.name)}</h2>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Public channel</p>
                  </div>
                </header>

                <div className="border-b border-line bg-surface-2/40 px-4 py-3 text-sm text-muted">
                  {activeChannel.topic || "No topic set."}
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4">
                  {messagesPending ? (
                    <div className="text-sm text-muted">Loading messages...</div>
                  ) : combinedChannelMessages.length === 0 ? (
                    <div className="text-sm text-muted">No chat messages found in this channel yet.</div>
                  ) : (
                    combinedChannelMessages.map((message) => {
                      const isMine = message.author === player?.name;
                      const normalizedText = message.text.replace(/^\u0001ACTION\s+/i, "");

                      return (
                        <div
                          key={`${message.channel}-${message.id}`}
                          className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}
                        >
                          {!isMine && (
                            <div className="h-7 w-7 flex-shrink-0 rounded border border-line bg-surface-2" />
                          )}
                          <div
                            className={`max-w-[78%] rounded-2xl border px-3 py-2 ${
                              isMine
                                ? "border-accent/40 bg-accent/10 text-slate-50"
                                : "border-line bg-surface text-slate-100"
                            }`}
                          >
                            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted">
                              <span>{message.author}</span>
                              <span>·</span>
                              <span>{message.time}</span>
                            </div>
                            <div className="whitespace-pre-wrap text-sm leading-6 text-slate-100">
                              {renderChatText(normalizedText)}
                            </div>
                          </div>
                          {isMine && player && (
                            <Avatar
                              playerId={player.id}
                              className="h-7 w-7 rounded border border-line bg-surface-2 object-cover flex-shrink-0"
                            />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="border-t border-line bg-surface px-4 py-3">
                  <div className="flex flex-col gap-2 rounded-2xl border border-line bg-canvas px-3 py-2">
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value.slice(0, 500))}
                      maxLength={500}
                      placeholder={`Message ${formatChannelLabel(activeChannel.name)}...`}
                      className="w-full bg-transparent text-sm text-slate-100 placeholder:text-muted focus:outline-none"
                    />
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.12em] text-muted">
                      <span>{draft.length}/500</span>
                      <button
                        type="submit"
                        disabled={!draft.trim()}
                        className="rounded-xl bg-accent px-3 py-1.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center text-sm text-muted">No channel selected.</div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
