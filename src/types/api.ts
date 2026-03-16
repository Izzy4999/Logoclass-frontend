export interface ApiResponse<T = null> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: PaginationMeta;
}

export interface ApiError {
  success: false;
  message: string;
  error: string;
  statusCode: number;
  details?: { field: string; message: string }[] | null;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}
