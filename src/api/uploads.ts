import apiClient from "./client";
import type { ApiResponse } from "@/types/api";

export interface Material {
  id: string;
  url: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  contentType: "VIDEO" | "PDF" | "DOCUMENT" | "SPREADSHEET" | "PRESENTATION" | "OTHER";
}

export const uploadsApi = {
  /**
   * Upload a single file to Supabase S3.
   * Returns { id, url, originalName, mimeType, fileSize, contentType }.
   * Pass the returned `id` as a materialId when creating / editing a lesson.
   */
  upload: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData();
    form.append("file", file);
    return apiClient.post<ApiResponse<Material>>("/uploads", form, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
  },

  delete: (materialId: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/uploads/${materialId}`),
};
