import { http } from "@services/http";
import type { FolderContentDto } from "@dto/folder-content.dto";

export const FolderService = {
  ROOT_ID: "00000000-0000-0000-0000-000000000000",

  async getContents(folderId: string, pin: string = ""): Promise<FolderContentDto> {
    const isRoot = folderId === this.ROOT_ID;
    const endpoint = isRoot
      ? "/rootfilesandfolders"
      : `/folder/content/${folderId}${pin ? `?pin=${encodeURIComponent(pin)}` : ""}`;

    return http.get<FolderContentDto>(endpoint);
  },

  async checkProtection(folderId: string): Promise<boolean> {
    try {
      const res = await http.get<FolderContentDto>(`/folder/content/${folderId}`);
      return !!res?.is_protected;
    } catch {
      return false;
    }
  },

  async deleteFolder(folderId: string): Promise<void> {
    await http.delete(`/delete/folder/${folderId}`);
  },
};
