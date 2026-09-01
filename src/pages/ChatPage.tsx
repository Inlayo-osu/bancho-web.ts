import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Avatar } from "@/components/Avatar";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api/client";
import { usePageTitle } from "@/lib/usePageTitle";

function formatChannelLabel(name: string) {
  return name.startsWith("#") ? name : `#${name}`;
}

export function ChatPage() {
  usePageTitle("Chat");

  const [selectedChannel, setSelectedChannel] = useState<string>("#announce");

  const { data: channels = [], isPending: channelsPending } = useQuery({
    queryKey: ["chat-channels"],
    queryFn: () => api.fetchChatChannels(),
    select: (response) => response.data,
  });

  const sortedChannels = useMemo(
    () => [...channels].sort((a, b) => a.id - b.id),
    [channels],
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
    enabled: !!selectedChannel,
  });

  const activeChannel = sortedChannels.find((channel) => channel.name === selectedChannel) ?? sortedChannels[0];

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
                    onClick={() => setSelectedChannel(channel.name)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                      activeChannel?.name === channel.name
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
          </aside>

          <main className="flex min-h-0 flex-col">
            {activeChannel ? (
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
