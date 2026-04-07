import type { FolderContentDto } from "@dto/folder-content.dto";
import { FileModel } from "./file.model";
import { FolderModel } from "./folder.model";

export class FolderContentModel {
  files: FileModel[];
  folders: FolderModel[];
  isProtected: boolean;

  constructor(dto: FolderContentDto) {
    this.files = FileModel.fromArray(dto.files || []);
    this.folders = FolderModel.fromArray(dto.folders || []);
    this.isProtected = dto.is_protected;
  }

  static fromDto(dto: FolderContentDto): FolderContentModel {
    return new FolderContentModel(dto);
  }

  get allItems(): (FileModel | FolderModel)[] {
    return [...this.folders, ...this.files];
  }
}
