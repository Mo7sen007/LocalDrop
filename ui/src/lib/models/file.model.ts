import type { FileDto } from "@dto/file.dto";

export class FileModel {
  id: string;
  name: string;
  size: number;
  mime: string;
  extension: string;
  createdAt: Date;
  updatedAt: Date;
  isProtected: boolean;
  folderId: string | null;

  constructor(dto: FileDto) {
    this.id = dto.id;
    this.name = dto.name;
    this.size = dto.size;
    this.mime = dto.mime;
    this.extension = dto.extension;
    this.createdAt = new Date(dto.created_at);
    this.updatedAt = new Date(dto.updated_at);
    this.isProtected = dto.is_protected;
    this.folderId = dto.folder_id;
  }

  static fromDto(dto: FileDto): FileModel {
    return new FileModel(dto);
  }

  static fromArray(dtos: FileDto[]): FileModel[] {
    return dtos.map((d) => FileModel.fromDto(d));
  }
}
