export interface FileDto {
  id: string;
  name: string;
  size: number;
  mime: string;
  extension: string;
  created_at: string;
  updated_at: string;
  is_protected: boolean;
  folder_id: string | null;
}
