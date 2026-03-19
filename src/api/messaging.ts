import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { Conversation, Message, ContactUser } from "@/types/notification";

export const messagingApi = {
  listConversations: () =>
    apiClient.get<ApiResponse<Conversation[]>>("/messaging/conversations"),

  getContacts: () =>
    apiClient.get<ApiResponse<ContactUser[]>>("/messaging/contacts"),

  getClassGroups: () =>
    apiClient.get<ApiResponse<Conversation[]>>("/messaging/class-groups"),

  createConversation: (participantIds: string[]) =>
    apiClient.post<ApiResponse<Conversation>>("/messaging/conversations", { participantIds }),

  sendMessage: (conversationId: string, dto: { content: string; attachments?: string[] }) =>
    apiClient.post<ApiResponse<Message>>(`/messaging/conversations/${conversationId}/messages`, dto),

  getMessages: (conversationId: string, params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<Message>>(`/messaging/conversations/${conversationId}/messages`, { params }),

  markRead: (conversationId: string) =>
    apiClient.patch<ApiResponse<{ id: string; lastReadAt: string }>>(`/messaging/conversations/${conversationId}/read`),
};
