import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { messagingApi } from "@/api/messaging";
import { formatRelative } from "@/lib/utils";
import type { Conversation } from "@/types/notification";

export default function Messages() {
  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messagingApi.listConversations(),
  });

  const conversations: Conversation[] = data?.data?.data ?? [];

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Messages"
        description="Your conversations"
        action={
          <button
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            + New Message
          </button>
        }
      />

      {isLoading && <LoadingSpinner />}

      {!isLoading && conversations.length === 0 && (
        <EmptyState title="No conversations" description="Start a conversation to get messaging." />
      )}

      {!isLoading && conversations.length > 0 && (
        <div className="rounded-md border divide-y">
          {conversations.map((convo) => {
            const otherParticipants = convo.participants.slice(0, 2);
            const names = otherParticipants
              .map((p) => `${p.firstName} ${p.lastName}`)
              .join(", ");

            return (
              <Link
                key={convo.id}
                to={`${convo.id}`}
                className="flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                  {otherParticipants[0]?.firstName[0] ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm truncate">{names || "Conversation"}</p>
                    {convo.lastMessage && (
                      <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                        {formatRelative(convo.lastMessage.createdAt)}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {convo.lastMessage?.content ?? "No messages yet"}
                  </p>
                </div>
                {convo.unreadCount > 0 && (
                  <span className="flex-shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {convo.unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
