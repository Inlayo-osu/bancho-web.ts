import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth";
import { usePageTitle } from "@/lib/usePageTitle";

function formatChannelLabel(name: string) {
  return name.startsWith("#") ? name : `#${name}`;
}

export function ChatPage() {
  usePageTitle("Chat");
  const { player } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedChannel, setSelectedChannel] = useState<string>("#announce");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

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

  const { data: mailThreads = [], isPending: mailPending } = useQuery({
    queryKey: ["mail-threads", player?.id],
    queryFn: () => api.fetchMailThreads(),
    select: (response) => response.data,
    enabled: !!player,
  });

  const sortedChannels = useMemo(
    () => [...channels].sort((a, b) => a.id - b.id),
    [channels],
  );

  const sortedDMThreads = useMemo(
    () => [...mailThreads].sort((a, b) => b.unread_count - a.unread_count),
    [mailThreads],
  );

  useEffect(() => {
    if (!sortedChannels.length) return;
    if (!sortedChannels.some((channel) => channel.name === selectedChannel)) {
      setSelectedChannel(sortedChannels[0].name);
    }
  }, [selectedChannel, sortedChannels]);

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

  const activeChannel = sortedChannels.find((channel) => channel.name === selectedChannel) ?? sortedChannels[0];
  const activeDmThread = sortedDMThreads.find((thread) => thread.user_id === selectedUserId) ?? sortedDMThreads[0];

  const activeMessages = selectedUserId !== null ? dmMessages : messages;
  const activePending = selectedUserId !== null ? dmMessagesPending : messagesPending;

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

            <div className="space-y-1 p-2">
              {channelsPending ? (
                <div className="px-3 py-2 text-sm text-muted">Loading channels...</div>
              ) : (
                sortedChannels.map((channel) => (
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
                    <span className="font-medium">{formatChannelLabel(channel.name)}</span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-muted">#{channel.id}</span>
                  </button>
                ))
              )}
            </div>

            <div className="border-b border-line px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Messages</p>
            </div>

            <div className="space-y-1 p-2">
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
                      setSelectedChannel("#announce");
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                      selectedUserId === thread.user_id
                        ? "bg-surface-3 text-slate-100"
                        : "text-muted hover:bg-surface-3 hover:text-slate-100"
                    }`}
                  >
                    <span className="font-medium">{thread.name}</span>
                    {thread.unread_count > 0 && (
                      <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                        {thread.unread_count}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </aside>

          <main className="flex min-h-0 flex-col">
            {selectedUserId !== null && activeDmThread ? (
              <>
                <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <Avatar playerId={activeDmThread.user_id % 10 || 1} className="h-10 w-10 rounded-lg border border-line bg-surface-2 object-cover" />
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
                      const messageText = isDm ? message.msg : message.text;
                      const messageTime = isDm
                        ? new Date(message.time * 1000).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : message.time;

                      return (
                        <div
                          key={`${isDm ? `dm-${message.id}` : `${message.channel}-${message.id}`}`}
                          className="flex justify-start"
                        >
                          <div className="max-w-[78%] rounded-2xl border border-line bg-surface px-3 py-2">
                            <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted">
                              <span>{senderName}</span>
                              <span>·</span>
                              <span>{messageTime}</span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">{messageText}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : activeChannel ? (
              <>
                <header className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <Avatar playerId={activeChannel.id % 10 || 1} className="h-10 w-10 rounded-lg border border-line bg-surface-2 object-cover" />
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
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-muted">No chat messages found in this channel yet.</div>
                  ) : (
                    messages.map((message) => (
                      <div key={`${message.channel}-${message.id}`} className="flex justify-start">
                        <div className="max-w-[78%] rounded-2xl border border-line bg-surface px-3 py-2">
                          <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted">
                            <span>{message.author}</span>
                            <span>·</span>
                            <span>{message.time}</span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-100">{message.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
