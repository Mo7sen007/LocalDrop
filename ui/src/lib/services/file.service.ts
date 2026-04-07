import { http, triggerDownload } from "@services/http";
import { API_BASE } from "@config";

export const FileService = {
  async deleteFile(fileId: string): Promise<void> {
    await http.delete(`/delete/file/${fileId}`);
  },

  downloadFile(fileId: string, pin: string = ""): void {
    const url = `${API_BASE}/download/${fileId}${pin ? `?pin=${encodeURIComponent(pin)}` : ""}`;
    triggerDownload(url);
  },

  downloadFolder(folderId: string, pin: string = ""): void {
    const url = `${API_BASE}/download-folder/${folderId}${pin ? `?pin=${encodeURIComponent(pin)}` : ""}`;
    triggerDownload(url);
  },
};
