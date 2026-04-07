import { http } from "@services/http";

export interface UploadDescriptor {
  type: "file" | "files" | "folder";
  totalFiles: number;
  totalSize: number;
  entries: UploadEntry[];
}

export interface UploadEntry {
  file: File;
  size: number;
  relativePath: string | null;
}

export const UploadService = {
  async upload(
    descriptor: UploadDescriptor,
    options: {
      displayName?: string;
      pinCode?: string;
      parentId?: string;
    } = {},
  ): Promise<void> {
    const formData = new FormData();

    if (options.parentId) {
      formData.append("parent_id", options.parentId);
    }
    formData.append("pin_code", options.pinCode || "");
    formData.append("contentType", descriptor.type);

    if (
      (descriptor.type === "file" || descriptor.type === "folder") &&
      options.displayName
    ) {
      formData.append("display_name", options.displayName.trim());
    }

    for (const entry of descriptor.entries) {
      formData.append("files", entry.file);
      if (entry.relativePath) {
        formData.append("paths", entry.relativePath);
      }
    }

    await http.post("/upload", formData, { json: false });
  },
};
