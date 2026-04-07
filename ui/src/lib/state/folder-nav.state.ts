import { signal } from "@tinyfx/runtime";
import { FolderService } from "@services/folder.service";

export interface FolderHistoryEntry {
  id: string;
  name: string;
}

class FolderNavState {
  currentFolderId = signal<string>(FolderService.ROOT_ID);
  folderHistory = signal<FolderHistoryEntry[]>([]);
  folderPinCache = new Map<string, string>();

  get ROOT_ID(): string {
    return FolderService.ROOT_ID;
  }

  setCurrentFolderID(folderId: string): void {
    this.currentFolderId.set(folderId || this.ROOT_ID);
  }

  getCurrentFolderID(): string {
    return this.currentFolderId();
  }

  getFolderHistory(): FolderHistoryEntry[] {
    return this.folderHistory();
  }

  cacheFolderPin(folderId: string, pin: string): void {
    if (folderId && pin) {
      this.folderPinCache.set(folderId, pin);
    }
  }

  getCachedPin(folderId: string): string {
    if (!folderId) return "";
    return this.folderPinCache.get(folderId) || "";
  }

  navigateToFolder(folderId: string, folderName: string, pin: string, loadFn: (folderId: string, pin: string) => void): void {
    this.folderHistory.set([
      ...this.folderHistory(),
      { id: this.currentFolderId(), name: folderName },
    ]);
    this.setCurrentFolderID(folderId);
    loadFn(folderId, pin);
  }

  navigateBack(loadFn: (folderId: string, pin: string) => void): void {
    const history = this.folderHistory();
    if (history.length > 0) {
      const newHistory = [...history];
      const previousFolder = newHistory.pop()!;
      this.folderHistory.set(newHistory);
      this.setCurrentFolderID(previousFolder.id);
      loadFn(previousFolder.id, "");
    } else {
      this.setCurrentFolderID(this.ROOT_ID);
      loadFn(this.ROOT_ID, "");
    }
  }
}

export const folderNav = new FolderNavState();
