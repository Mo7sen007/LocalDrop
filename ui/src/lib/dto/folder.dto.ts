export interface FolderDto {
  id: string;
  name: string;
  size: number;
  created_at: string;
  updated_at: string;
  is_protected: boolean;
  parent_id: string | null;
}
