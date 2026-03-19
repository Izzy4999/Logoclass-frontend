import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, MessageSquarePlus, Send, Users, User, Loader2, ArrowLeft,
} from "lucide-react";
import { messagingApi } from "@/api/messaging";
import { useAuth } from "@/hooks/useAuth";
import { getSocket } from "@/lib/socket";
import { cn, formatRelative } from "@/lib/utils";
import type { Conversation, Message, ContactUser } from "@/types/notification";

// ─────────────────────────────────────────────────────────────────────────────
//  Avatar helper
// ─────────────────────────────────────────────────────────────────────────────

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-base" : "h-10 w-10 text-sm";
  return (
    <div className={cn("rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold flex-shrink-0", sizeClass)}>
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Conversation list item
// ─────────────────────────────────────────────────────────────────────────────

function ConvItem({
  conv, isActive, currentUserId, onClick,
}: { conv: Conversation; isActive: boolean; currentUserId: string; onClick: () => void }) {
  const displayName = conv.isGroup
    ? (conv.name ?? "Group")
    : conv.participants.filter((p) => p.id !== currentUserId).map((p) => `${p.firstName} ${p.lastName}`).join(", ") || "You";

  const lastMsg = conv.lastMessage;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left",
        isActive && "bg-primary/5 border-r-2 border-primary"
      )}
    >
      {conv.isGroup ? (
        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Users className="h-5 w-5 text-indigo-600" />
        </div>
      ) : (
        <Avatar name={displayName} />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-sm font-semibold text-slate-800 truncate">{displayName}</span>
          {lastMsg && (
            <span className="text-[11px] text-slate-400 flex-shrink-0 ml-2">{formatRelative(lastMsg.createdAt)}</span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">
          {lastMsg
            ? `${lastMsg.sender.id === currentUserId ? "You: " : ""}${lastMsg.content}`
            : "No messages yet"}
        </p>
      </div>
      {conv.unreadCount > 0 && (
        <span className="flex-shrink-0 h-5 min-w-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
        </span>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Message bubble
// ─────────────────────────────────────────────────────────────────────────────

function MsgBubble({ msg, isMine }: { msg: Message; isMine: boolean }) {
  return (
    <div className={cn("flex gap-2 items-end", isMine ? "flex-row-reverse" : "flex-row")}>
      {!isMine && <Avatar name={`${msg.sender.firstName} ${msg.sender.lastName}`} size="sm" />}
      <div className={cn("max-w-[70%]", isMine ? "items-end" : "items-start", "flex flex-col gap-0.5")}>
        {!isMine && (
          <span className="text-xs text-slate-500 px-1">
            {msg.sender.firstName} {msg.sender.lastName}
          </span>
        )}
        <div
          className={cn(
            "px-3 py-2 rounded-2xl text-sm leading-relaxed break-words",
            isMine
              ? "bg-primary text-white rounded-br-sm"
              : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm"
          )}
        >
          {msg.content}
        </div>
        <span className="text-[10px] text-slate-400 px-1">{formatRelative(msg.createdAt)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Chat panel (right side)
// ─────────────────────────────────────────────────────────────────────────────

function ChatPanel({
  conv, currentUserId, onBack,
}: { conv: Conversation; currentUserId: string; onBack: () => void }) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const displayName = conv.isGroup
    ? (conv.name ?? "Group")
    : conv.participants.filter((p) => p.id !== currentUserId).map((p) => `${p.firstName} ${p.lastName}`).join(", ") || "You";

  const subLabel = conv.isGroup ? `${conv.participants.length} members` : "";

  const { data, isLoading } = useQuery({
    queryKey: ["messages", conv.id],
    queryFn: () => messagingApi.getMessages(conv.id, { limit: 100 }),
    refetchInterval: false,
  });

  const { mutate: sendMsg, isPending } = useMutation({
    mutationFn: (content: string) => messagingApi.sendMessage(conv.id, { content }),
    onSuccess: () => {
      setInput("");
      qc.invalidateQueries({ queryKey: ["messages", conv.id] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const { mutate: markRead } = useMutation({
    mutationFn: (conversationId: string) => messagingApi.markRead(conversationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  // Mark read on open — fires via mutation so React Query tracks the call properly
  useEffect(() => {
    markRead(conv.id);
  }, [conv.id, markRead]);

  // Socket: join/leave room
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit("join_conversation", { conversationId: conv.id });
    const handler = (data: { conversationId: string }) => {
      if (data.conversationId === conv.id) {
        qc.invalidateQueries({ queryKey: ["messages", conv.id] });
        qc.invalidateQueries({ queryKey: ["conversations"] });
      }
    };
    socket.on("new_message", handler);
    return () => {
      socket.off("new_message", handler);
      socket.emit("leave_conversation", { conversationId: conv.id });
    };
  }, [conv.id, qc]);

  // Scroll to bottom when messages change
  const messages: Message[] = data?.data?.data ?? [];
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isPending) sendMsg(input.trim());
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white">
        <button
          onClick={onBack}
          className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        {conv.isGroup ? (
          <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-indigo-600" />
          </div>
        ) : (
          <Avatar name={displayName} />
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
          {subLabel && <p className="text-xs text-slate-500 truncate">{subLabel}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        {!isLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <MessageSquarePlus className="h-7 w-7 text-primary" />
            </div>
            <p className="text-sm font-medium text-slate-600">No messages yet</p>
            <p className="text-xs text-slate-400 mt-1">Send the first message!</p>
          </div>
        )}
        {messages.map((msg) => (
          <MsgBubble key={msg.id} msg={msg} isMine={msg.sender.id === currentUserId} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-slate-200 bg-white">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 border border-slate-200 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-slate-50"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent); } }}
        />
        <button
          type="submit"
          disabled={!input.trim() || isPending}
          className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  New Chat dialog
// ─────────────────────────────────────────────────────────────────────────────

function NewChatDialog({
  contacts, groups, isLoading, currentUserId, onSelect, onClose,
}: {
  contacts: ContactUser[];
  groups: Conversation[];
  isLoading: boolean;
  currentUserId: string;
  onSelect: (conv: Conversation) => void;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const createMut = useMutation({
    mutationFn: (participantId: string) => messagingApi.createConversation([participantId]),
    onSuccess: (res) => {
      const conv = res.data?.data;
      if (conv) {
        qc.invalidateQueries({ queryKey: ["conversations"] });
        onSelect(conv);
      }
    },
  });

  const filteredContacts = contacts.filter((c) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase())
  );
  const filteredGroups = groups.filter((g) =>
    (g.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">New Chat</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 p-2">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}

          {/* Class groups */}
          {filteredGroups.length > 0 && (
            <>
              <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Class Groups</p>
              {filteredGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => { onSelect(g); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{g.name}</p>
                    <p className="text-xs text-slate-500">{g.participants.length} members</p>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Direct contacts */}
          {filteredContacts.length > 0 && (
            <>
              <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wide mt-2">People</p>
              {filteredContacts.map((c) => (
                <button
                  key={c.id}
                  disabled={createMut.isPending}
                  onClick={() => createMut.mutate(c.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left disabled:opacity-60"
                >
                  <Avatar name={`${c.firstName} ${c.lastName}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.firstName} {c.lastName}</p>
                    {c.role && <p className="text-xs text-slate-500 truncate">{c.role.name}</p>}
                  </div>
                  {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin text-slate-400 ml-auto" />}
                </button>
              ))}
            </>
          )}

          {!isLoading && filteredContacts.length === 0 && filteredGroups.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-8">No contacts available</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Messages page
// ─────────────────────────────────────────────────────────────────────────────

export default function Messages() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [search, setSearch] = useState("");
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [showChat, setShowChat] = useState(false); // mobile: true = show chat panel

  const currentUserId = user?.id ?? "";

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: convsData, isLoading: convsLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => messagingApi.listConversations(),
    refetchInterval: 30_000,
  });

  // Auto-init class groups (students/teachers) — runs once
  useQuery({
    queryKey: ["class-groups"],
    queryFn: async () => {
      const res = await messagingApi.getClassGroups();
      // After creating class groups, refresh conversations list
      qc.invalidateQueries({ queryKey: ["conversations"] });
      return res;
    },
    staleTime: Infinity,
  });

  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ["messaging-contacts"],
    queryFn: () => messagingApi.getContacts(),
    enabled: newChatOpen,
  });

  const { data: classGroupsData } = useQuery({
    queryKey: ["class-groups-list"],
    queryFn: () => messagingApi.getClassGroups(),
    enabled: newChatOpen,
    staleTime: 60_000,
  });

  // ── Socket global listener ───────────────────────────────────────────────

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
    };
    socket.on("new_message", handler);
    return () => {
      socket.off("new_message", handler);
    };
  }, [qc]);

  // ── Derived data ─────────────────────────────────────────────────────────

  const conversations: Conversation[] = convsData?.data?.data ?? [];
  const contacts: ContactUser[] = contactsData?.data?.data ?? [];
  const classGroups: Conversation[] = classGroupsData?.data?.data ?? [];

  const filtered = conversations.filter((c) => {
    if (!search) return true;
    const name = c.isGroup
      ? (c.name ?? "")
      : c.participants.filter((p) => p.id !== currentUserId).map((p) => `${p.firstName} ${p.lastName}`).join(" ");
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const handleSelectConv = (conv: Conversation) => {
    setSelectedConv(conv);
    setShowChat(true);
    setNewChatOpen(false);
  };

  const handleBack = () => {
    setShowChat(false);
    setSelectedConv(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm -m-6">

      {/* ── Left panel: conversation list ───────────────────────────────── */}
      <div className={cn(
        "flex flex-col border-r border-slate-200 w-full md:w-80 flex-shrink-0",
        showChat ? "hidden md:flex" : "flex"
      )}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-slate-800">Messages</h1>
            <button
              onClick={() => setNewChatOpen(true)}
              className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors"
              title="New chat"
            >
              <MessageSquarePlus className="h-4 w-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {convsLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}

          {!convsLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-16 px-6 text-center">
              <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <User className="h-7 w-7 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No conversations</p>
              <p className="text-xs text-slate-400 mt-1">
                Tap <span className="font-medium text-primary">New Chat</span> to get started
              </p>
            </div>
          )}

          {filtered.map((conv) => (
            <ConvItem
              key={conv.id}
              conv={conv}
              isActive={selectedConv?.id === conv.id}
              currentUserId={currentUserId}
              onClick={() => handleSelectConv(conv)}
            />
          ))}
        </div>
      </div>

      {/* ── Right panel: chat ────────────────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex flex-col",
        !showChat && "hidden md:flex"
      )}>
        {selectedConv ? (
          <ChatPanel conv={selectedConv} currentUserId={currentUserId} onBack={handleBack} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="h-20 w-20 rounded-full bg-primary/8 flex items-center justify-center mb-4">
              <MessageSquarePlus className="h-10 w-10 text-primary/50" />
            </div>
            <h3 className="text-base font-semibold text-slate-600 mb-1">Select a conversation</h3>
            <p className="text-sm text-slate-400 max-w-xs">
              Choose from your existing conversations or start a new one.
            </p>
            <button
              onClick={() => setNewChatOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <MessageSquarePlus className="h-4 w-4" /> New Chat
            </button>
          </div>
        )}
      </div>

      {/* ── New Chat dialog ──────────────────────────────────────────────── */}
      {newChatOpen && (
        <NewChatDialog
          contacts={contacts}
          groups={classGroups}
          isLoading={contactsLoading}
          currentUserId={currentUserId}
          onSelect={handleSelectConv}
          onClose={() => setNewChatOpen(false)}
        />
      )}
    </div>
  );
}
