import type { FolderDto } from "@dto/folder.dto";

export class FolderModel {
  id: string;
  name: string;
  size: number;
  createdAt: Date;
  updatedAt: Date;
  isProtected: boolean;
  parentId: string | null;

  constructor(dto: FolderDto) {
    this.id = dto.id;
    this.name = dto.name;
    this.size = dto.size;
    this.createdAt = new Date(dto.created_at);
    this.updatedAt = new Date(dto.updated_at);
    this.isProtected = dto.is_protected;
    this.parentId = dto.parent_id;
  }

  static fromDto(dto: FolderDto): FolderModel {
    return new FolderModel(dto);
  }

  static fromArray(dtos: FolderDto[]): FolderModel[] {
    return dtos.map((d) => FolderModel.fromDto(d));
  }
}
