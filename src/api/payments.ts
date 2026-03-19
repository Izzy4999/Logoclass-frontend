import apiClient from "./client";
import type { ApiResponse, PaginatedResponse, PaginationParams } from "@/types/api";
import type { Fee, FeeAssignment, Payment, PaymentConfig } from "@/types/payment";

export const paymentsApi = {
  // Config
  getConfig: () =>
    apiClient.get<ApiResponse<PaymentConfig>>("/payments/config"),

  saveConfig: (dto: { provider: string; publicKey?: string; secretKey: string }) =>
    apiClient.put<ApiResponse<PaymentConfig>>("/payments/config", dto),

  deleteConfig: () =>
    apiClient.delete<ApiResponse<{ message: string }>>("/payments/config"),

  // Fees
  listFees: (params?: PaginationParams & { gradeLevelId?: string; academicYearId?: string; termId?: string; category?: string; isActive?: boolean }) =>
    apiClient.get<PaginatedResponse<Fee>>("/fees", { params }),

  createFee: (dto: Partial<Fee>) =>
    apiClient.post<ApiResponse<Fee>>("/fees", dto),

  getFee: (id: string) =>
    apiClient.get<ApiResponse<Fee>>(`/fees/${id}`),

  updateFee: (id: string, dto: Partial<Fee>) =>
    apiClient.patch<ApiResponse<Fee>>(`/fees/${id}`, dto),

  deleteFee: (id: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/fees/${id}`),

  assignFee: (id: string, dto: { studentIds: string[]; amountOverride?: number; dueDate?: string }) =>
    apiClient.post<ApiResponse<{ assignmentCount: number }>>(`/fees/${id}/assign`, dto),

  listAssignments: (feeId: string, params?: PaginationParams) =>
    apiClient.get<PaginatedResponse<FeeAssignment>>(`/fees/${feeId}/assignments`, { params }),

  // Payments
  list: (params?: PaginationParams & { status?: string }) =>
    apiClient.get<PaginatedResponse<Payment>>("/payments", { params }),

  getMyFees: () =>
    apiClient.get<ApiResponse<FeeAssignment[]>>("/payments/my-fees"),

  initiate: (feeAssignmentId: string) =>
    apiClient.post<ApiResponse<Payment>>("/payments/initiate", { feeAssignmentId }),

  verify: (reference: string) =>
    apiClient.post<ApiResponse<Payment>>(`/payments/verify/${reference}`),

  record: (dto: { feeAssignmentId: string; method: string; reference: string; amount: number }) =>
    apiClient.post<ApiResponse<Payment>>("/payments/record", dto),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Payment>>(`/payments/${id}`),
};
