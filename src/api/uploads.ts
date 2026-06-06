import axios from "axios";
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

interface PresignedUrlPayload {
  presignedUrl: string;
  key: string;
  expiresIn: number;
}

export const uploadsApi = {
  /**
   * Upload a file directly to S3 via a presigned URL (3-step flow):
   *   1. POST /uploads/presigned  → get presigned PUT URL + S3 key
   *   2. PUT presignedUrl         → stream file bytes directly to S3 (progress tracked here)
   *   3. POST /uploads/confirm    → backend verifies S3 object exists, creates DB record
   *
   * Returns the same { id, url, originalName, mimeType, fileSize, contentType }
   * shape as before — callers (uploadManager) are unchanged.
   */
  upload: async (
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<{ data: ApiResponse<Material> }> => {
    // Step 1: get presigned URL
    const { data: presignedRes } = await apiClient.post<ApiResponse<PresignedUrlPayload>>(
      "/uploads/presigned",
      { filename: file.name, mimeType: file.type, fileSize: file.size },
    );
    const { presignedUrl, key } = presignedRes.data!;

    // Step 2: PUT directly to S3 — no auth header, no backend involved
    await axios.put(presignedUrl, file, {
      headers: { "Content-Type": file.type },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });

    // Step 3: confirm with backend to create the DB material record
    const confirmRes = await apiClient.post<ApiResponse<Material>>("/uploads/confirm", {
      key,
      originalName: file.name,
      mimeType: file.type,
      fileSize: file.size,
    });

    return confirmRes;
  },

  delete: (materialId: string) =>
    apiClient.delete<ApiResponse<{ message: string }>>(`/uploads/${materialId}`),
};
