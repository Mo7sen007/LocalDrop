import { onMount, onDestroy } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";
import { FolderService } from "@services/folder.service";
import { FileService } from "@services/file.service";
import { folderNav } from "@state/folder-nav.state";
import { toast } from "@state/toast.state";
import type { PinModal, PinAction } from "@components/PinModal/PinModal";
import type { ShareModal } from "@components/ShareModal/ShareModal";
import type { FileModel } from "@models/file.model";
import type { FolderModel } from "@models/folder.model";
import { API_BASE } from "@config";

export function init(el: HTMLElement, ctx: TinyFxContext): void {
  let pinModal: PinModal | null = null;
  let shareModal: ShareModal | null = null;

  onMount(() => {
    pinModal = el.querySelector<PinModal>("[data-pin-modal]") as unknown as PinModal;
    shareModal = el.querySelector<ShareModal>("[data-share-modal]") as unknown as ShareModal;

    const refreshBtn = el.querySelector("#refreshBtn");
    refreshBtn?.addEventListener("click", () => loadFiles());

    loadFiles();
  });

  onDestroy(() => {
    pinModal = null;
    shareModal = null;
  });

  async function loadFiles(folderId?: string, pin: string = ""): void {
    const targetId = folderId || folderNav.getCurrentFolderID();
    folderNav.setCurrentFolderID(targetId);

    if (!pin && targetId) {
      const cached = folderNav.getCachedPin(targetId);
      if (cached) pin = cached;
    }

    const loadingEl = el.querySelector<HTMLElement>("#loadingState");
    const tableEl = el.querySelector<HTMLTableElement>("#fileTable");
    const emptyEl = el.querySelector<HTMLElement>("#emptyState");

    if (loadingEl) loadingEl.style.display = "flex";
    if (tableEl) tableEl.style.display = "none";
    if (emptyEl) emptyEl.style.display = "none";

    try {
      const data = await FolderService.getContents(targetId, pin);
      if (pin) folderNav.cacheFolderPin(targetId, pin);

      if (loadingEl) loadingEl.style.display = "none";

      const isRoot = targetId === FolderService.ROOT_ID;
      const allItems = [...(data.folders || []), ...(data.files || [])];

      if (allItems.length === 0) {
        if (tableEl) tableEl.style.display = "none";
        if (!isRoot) {
          renderBackButton(tableEl);
        } else {
          if (emptyEl) emptyEl.style.display = "block";
        }
        return;
      }

      renderTable(data, isRoot, tableEl);
      if (tableEl) tableEl.style.display = "table";
    } catch {
      if (loadingEl) loadingEl.style.display = "none";
      toast.show("Failed to load files. Please try again.", "error");
    }
  }

  function renderTable(data: Record<string, unknown>, isRoot: boolean, tableEl: HTMLTableElement | null): void {
    if (!tableEl) return;

    const folders = (data.folders || []) as Array<Record<string, unknown>>;
    const files = (data.files || []) as Array<Record<string, unknown>>;

    let tbody = tableEl.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      tableEl.appendChild(tbody);
    }
    tbody.innerHTML = "";

    if (!isRoot && folderNav.getFolderHistory().length > 0) {
      const backRow = document.createElement("tr");
      backRow.className = "folder-row back-row";
      backRow.innerHTML = `<td colspan="4" style="cursor:pointer;font-weight:bold"><i class="fa-solid fa-arrow-left" style="margin-right:0.5rem"></i>Back to parent folder</td>`;
      backRow.addEventListener("click", () => navigateBack());
      tbody.appendChild(backRow);
    }

    folders.forEach((folder) => {
      const row = createFolderRow(folder as unknown as FolderModel);
      tbody!.appendChild(row);
    });

    files.forEach((file) => {
      const row = createFileRow(file as unknown as FileModel);
      tbody!.appendChild(row);
    });
  }

  function createFolderRow(folder: FolderModel): HTMLTableRowElement {
    const row = document.createElement("tr");
    row.className = "folder-row";
    row.style.cursor = "pointer";

    const folderLink = `${API_BASE}/download-folder/${folder.id}`;

    row.innerHTML = `
      <td class="name-cell">
        <div class="name-stack">
          <i class="fa-solid fa-folder" aria-hidden="true"></i>
          <span class="name-text" title="${escapeHtml(folder.name)}">${escapeHtml(truncateName(folder.name))}</span>
        </div>
      </td>
      <td>${formatBytes(folder.size)}</td>
      <td>Folder</td>
      <td>
        <button class="btn-link share-btn" data-url="${folderLink}">Share</button>
        <button class="btn-link primary folder-download-btn" data-folder-id="${folder.id}">Download</button>
      </td>
    `;

    row.querySelector(".share-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      shareModal?.show(folderLink);
    });

    row.querySelector(".folder-download-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleFolderDownload(folder.id, folder.isProtected);
    });

    row.addEventListener("click", (e) => {
      if (!(e.target as HTMLElement).closest(".btn-link")) {
        handleFolderNavigation(folder.id, folder.name, folder.isProtected);
      }
    });

    return row;
  }

  function createFileRow(file: FileModel): HTMLTableRowElement {
    const row = document.createElement("tr");
    const downloadLink = `${API_BASE}/download/${file.id}`;

    row.innerHTML = `
      <td class="name-cell">
        <div class="name-stack">
          <i class="fa-regular fa-file" aria-hidden="true"></i>
          <span class="name-text" title="${escapeHtml(file.name)}">${escapeHtml(truncateName(file.name))}</span>
          <button class="copy-btn" title="Copy download link" data-copy="${downloadLink}">
            <i class="fa-regular fa-copy" aria-hidden="true"></i>
          </button>
        </div>
      </td>
      <td>${formatBytes(file.size)}</td>
      <td>${file.extension || "file"}</td>
      <td>
        <button class="btn-link share-btn" data-url="${downloadLink}">Share</button>
        <button class="btn-link primary download-btn" data-file-id="${file.id}">Download</button>
      </td>
    `;

    row.querySelector(".copy-btn")?.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(downloadLink);
        toast.show("Link copied to clipboard", "success");
      } catch {
        toast.show("Failed to copy link", "error");
      }
    });

    row.querySelector(".share-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      shareModal?.show(downloadLink);
    });

    row.querySelector(".download-btn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      handleFileDownload(file.id, file.isProtected);
    });

    return row;
  }

  function renderBackButton(tableEl: HTMLTableElement | null): void {
    if (!tableEl) return;
    let tbody = tableEl.querySelector("tbody");
    if (!tbody) {
      tbody = document.createElement("tbody");
      tableEl.appendChild(tbody);
    }
    const backRow = document.createElement("tr");
    backRow.className = "folder-row back-row";
    backRow.style.cursor = "pointer";
    backRow.innerHTML = `<td colspan="4" style="font-weight:bold"><i class="fa-solid fa-arrow-left" style="margin-right:0.5rem"></i>Back to parent folder</td>`;
    backRow.addEventListener("click", () => navigateBack());
    tbody.appendChild(backRow);
  }

  function navigateBack(): void {
    folderNav.navigateBack((id, pin) => loadFiles(id, pin));
  }

  async function handleFolderNavigation(folderId: string, folderName: string, isProtected: boolean): Promise<void> {
    try {
      if (isProtected) {
        pinModal?.show(
          { type: "folder-open", id: folderId, name: folderName },
          (pin) => {
            folderNav.cacheFolderPin(folderId, pin);
            folderNav.navigateToFolder(folderId, folderName, pin, (id, p) => loadFiles(id, p));
            pinModal?.hide();
          }
        );
        return;
      }
      folderNav.navigateToFolder(folderId, folderName, "", (id, p) => loadFiles(id, p));
    } catch {
      toast.show("Failed to open folder", "error");
    }
  }

  function handleFileDownload(fileId: string, isProtected: boolean): void {
    if (isProtected) {
      pinModal?.show(
        { type: "file", id: fileId },
        (pin) => {
          FileService.downloadFile(fileId, pin);
          pinModal?.hide();
        }
      );
      return;
    }
    FileService.downloadFile(fileId);
  }

  function handleFolderDownload(folderId: string, isProtected: boolean): void {
    if (isProtected) {
      pinModal?.show(
        { type: "folder-download", id: folderId },
        (pin) => {
          FileService.downloadFolder(folderId, pin);
          pinModal?.hide();
        }
      );
      return;
    }
    FileService.downloadFolder(folderId);
  }

  function formatBytes(bytes: number): string {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  function truncateName(name: string, head = 6, tail = 4): string {
    if (name.length <= head + tail + 3) return name;
    return `${name.slice(0, head)}...${name.slice(-tail)}`;
  }

  function escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}
