import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Search, MessageSquarePlus } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import Modal from "@/components/shared/Modal";
import { messagingApi } from "@/api/messaging";
import { usersApi } from "@/api/users";
import { formatRelative } from "@/lib/utils";
import type { Conversation } from "@/types/notification";
import type { User } from "@/types/user";

export default function Messages() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<{ id: string; name: string }[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messagingApi.listConversations(),
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["users-search", userSearch],
    queryFn: () => usersApi.list({ search: userSearch || undefined, limit: 20 }),
    enabled: createOpen && userSearch.length >= 2,
  });

  const users: User[] = usersData?.data?.data ?? [];

  const createMut = useMutation({
    mutationFn: (participantIds: string[]) => messagingApi.createConversation(participantIds),
    onSuccess: (res) => {
      const convo = res.data?.data;
      setCreateOpen(false);
      setSelectedUsers([]);
      setUserSearch("");
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (convo?.id) navigate(`${convo.id}`);
    },
  });

  const toggleUser = (user: User) => {
    setSelectedUsers(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, { id: user.id, name: `${user.firstName} ${user.lastName}` }]
    );
  };

  const conversations: Conversation[] = data?.data?.data ?? [];

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader
        title="Messages"
        description="Your conversations"
        action={
          <button
            onClick={() => { setCreateOpen(true); setSelectedUsers([]); setUserSearch(""); }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90"
          >
            <MessageSquarePlus className="h-4 w-4" /> New Message
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

      {/* New Conversation Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Conversation" size="lg">
        <div className="space-y-3">
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map(u => (
                <span key={u.id} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full font-medium">
                  {u.name}
                  <button type="button" onClick={() => setSelectedUsers(prev => prev.filter(s => s.id !== u.id))}
                    className="hover:text-red-500 ml-0.5">&times;</button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              placeholder="Search users by name or email…"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          {userSearch.length >= 2 && (
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {usersLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : users.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">No users found</p>
              ) : (
                users.map(u => {
                  const isSelected = selectedUsers.some(s => s.id === u.id);
                  return (
                    <button key={u.id} type="button" onClick={() => toggleUser(u)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors ${isSelected ? "bg-primary/5" : ""}`}>
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                        {u.firstName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      {isSelected && <span className="text-primary text-xs font-semibold">Selected</span>}
                    </button>
                  );
                })
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg text-muted-foreground hover:bg-slate-50">Cancel</button>
            <button
              type="button"
              onClick={() => {
                if (selectedUsers.length === 0) return;
                createMut.mutate(selectedUsers.map(u => u.id));
              }}
              disabled={selectedUsers.length === 0 || createMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50">
              {createMut.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Start Conversation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
