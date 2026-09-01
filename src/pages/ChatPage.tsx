import { PageHeader } from "@/components/ui/PageHeader";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { usePageTitle } from "@/lib/usePageTitle";

export function ChatPage() {
  usePageTitle("Chat");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chat"
        description="Channels, announcements, and direct conversations from the server."
      />

      <div className="max-w-6xl">
        <ChatPanel variant="page" />
      </div>
    </div>
  );
}
