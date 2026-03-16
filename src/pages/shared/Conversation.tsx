import { useParams, Link } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { messagingApi } from "@/api/messaging";
import { formatRelative } from "@/lib/utils";
import type { Message } from "@/types/notification";

export default function Conversation() {
  const { id } = useParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => messagingApi.getMessages(id!),
    enabled: !!id,
  });

  const { mutate: sendMsg, isPending } = useMutation({
    mutationFn: () => messagingApi.sendMessage(id!, { content: message }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["messages", id] });
    },
  });

  const messages: Message[] = data?.data?.data ?? [];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) sendMsg();
  };

  return (
    <div className="p-6 max-w-2xl flex flex-col h-[calc(100vh-80px)]">
      <PageHeader
        title="Conversation"
        action={<Link to=".." className="text-sm text-muted-foreground hover:text-foreground">Back</Link>}
      />

      <div className="flex-1 rounded-lg border overflow-y-auto p-4 mb-4 space-y-3">
        {isLoading && <LoadingSpinner />}

        {!isLoading && messages.length === 0 && (
          <EmptyState title="No messages yet" description="Send the first message." />
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
              {msg.sender.firstName[0]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">
                  {msg.sender.firstName} {msg.sender.lastName}
                </span>
                <span className="text-xs text-muted-foreground">{formatRelative(msg.createdAt)}</span>
              </div>
              <div className="text-sm bg-muted rounded-lg px-3 py-2 inline-block max-w-sm">
                {msg.content}
              </div>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={isPending || !message.trim()}
          className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
