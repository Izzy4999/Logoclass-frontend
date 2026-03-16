import apiClient from "./client";
import type { PaginatedResponse, PaginationParams } from "@/types/api";

export interface ActionLog {
  id: string;
  actor: { id: string; firstName: string; lastName: string };
  entity: string;
  entityId: string;
  action: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  createdAt: string;
}

export const actionLogsApi = {
  list: (params?: PaginationParams & { actorId?: string; entity?: string; action?: string; fromDate?: string; toDate?: string }) =>
    apiClient.get<PaginatedResponse<ActionLog>>("/action-logs", { params }),
};
