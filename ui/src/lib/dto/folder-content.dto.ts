import type { FileDto } from "./file.dto";
import type { FolderDto } from "./folder.dto";

export interface FolderContentDto {
  files: FileDto[];
  folders: FolderDto[];
  is_protected: boolean;
}
