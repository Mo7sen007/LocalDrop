import { signal, effect } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";
import type { UploadDescriptor, UploadEntry } from "@services/upload.service";
import { setUploadDescriptor, clearUploadDescriptor, uploadDescriptor } from "@state/upload.state";

export class UploadDropzone {
  descriptor = signal<UploadDescriptor | null>(null);
  dropText = signal<string>("Drop files or folders here");
  private fileInput: HTMLInputElement | null = null;
  private folderInput: HTMLInputElement | null = null;

  constructor(public el: HTMLElement, public ctx: TinyFxContext) {}

  init(): void {
    this.fileInput = this.el.querySelector<HTMLInputElement>("[data-file-input]");
    this.folderInput = this.el.querySelector<HTMLInputElement>("[data-folder-input]");
    const dropTextEl = this.el.querySelector<HTMLElement>(".file-drop-text");
    const pickFilesBtn = this.el.querySelector("[data-pick-files]");
    const pickFolderBtn = this.el.querySelector("[data-pick-folder]");
    const displayNameInput = this.el.closest("form")?.querySelector<HTMLInputElement>("[data-display-name]");

    pickFilesBtn?.addEventListener("click", () => this.fileInput?.click());
    pickFolderBtn?.addEventListener("click", () => this.folderInput?.click());

    this.el.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.el.classList.add("dragover");
    });
    this.el.addEventListener("dragleave", () => {
      this.el.classList.remove("dragover");
    });
    this.el.addEventListener("drop", async (e) => {
      e.preventDefault();
      this.el.classList.remove("dragover");
      const entries = await this.extractDropEntries(e.dataTransfer);
      if (!entries.length) return;
      const desc = this.buildDescriptor(entries);
      this.descriptor.set(desc);
      setUploadDescriptor(desc);
      this.updateDisplay(desc);
      this.autoFillDisplayName(desc, displayNameInput);
      if (this.fileInput) this.fileInput.value = "";
      if (this.folderInput) this.folderInput.value = "";
    });

    this.fileInput?.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        const desc = this.analyzeFiles(Array.from(target.files), false);
        this.descriptor.set(desc);
        setUploadDescriptor(desc);
        this.updateDisplay(desc);
        this.autoFillDisplayName(desc, displayNameInput);
        if (this.folderInput) this.folderInput.value = "";
      }
    });

    this.folderInput?.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        const desc = this.analyzeFiles(Array.from(target.files), true);
        this.descriptor.set(desc);
        setUploadDescriptor(desc);
        this.updateDisplay(desc);
        this.autoFillDisplayName(desc, displayNameInput);
        if (this.fileInput) this.fileInput.value = "";
      }
    });

    effect(() => {
      const text = this.dropText();
      if (dropTextEl) dropTextEl.textContent = text;
    });

    effect(() => {
      const desc = this.descriptor();
      if (!desc || !desc.entries.length) {
        this.el.classList.remove("has-file");
      } else {
        this.el.classList.add("has-file");
      }
    });

    effect(() => {
      const shared = uploadDescriptor();
      if (!shared) {
        this.descriptor.set(null);
        this.updateDisplay(null);
        if (this.fileInput) this.fileInput.value = "";
        if (this.folderInput) this.folderInput.value = "";
      }
    });
  }

  getDescriptor(): UploadDescriptor | null {
    return this.descriptor();
  }

  clear(): void {
    this.descriptor.set(null);
    clearUploadDescriptor();
    if (this.fileInput) this.fileInput.value = "";
    if (this.folderInput) this.folderInput.value = "";
  }

  private autoFillDisplayName(desc: UploadDescriptor, input: HTMLInputElement | null | undefined): void {
    if (!input) return;
    if (desc.type === "file" && desc.entries.length === 1) {
      input.value = desc.entries[0].file.name;
    } else if (desc.type === "folder" && desc.entries.length > 0) {
      const path = desc.entries[0].relativePath;
      if (path) {
        const folderName = path.split("/")[0];
        if (folderName) input.value = folderName;
      }
    } else {
      input.value = "";
    }
  }

  private updateDisplay(desc: UploadDescriptor | null): void {
    if (!desc || !desc.entries.length) {
      this.dropText.set("Drop files or folders here");
      return;
    }
    if (desc.type === "folder") {
      this.dropText.set(`${desc.totalFiles} items from folder`);
    } else if (desc.totalFiles === 1) {
      this.dropText.set(desc.entries[0].file.name);
    } else {
      this.dropText.set(`${desc.totalFiles} files selected`);
    }
  }

  private analyzeFiles(files: File[], fromFolderInput: boolean): UploadDescriptor {
    const hasRelativePath = files.some((f) => f.webkitRelativePath && f.webkitRelativePath.includes("/"));
    let type: "file" | "files" | "folder";
    if (files.length === 1 && !hasRelativePath) {
      type = "file";
    } else if (hasRelativePath || fromFolderInput) {
      type = "folder";
    } else {
      type = "files";
    }

    const entries: UploadEntry[] = files.map((f) => ({
      file: f,
      size: f.size,
      relativePath: f.webkitRelativePath || null,
    }));

    const totalSize = entries.reduce((s, e) => s + e.size, 0);

    return { type, totalFiles: entries.length, totalSize, entries };
  }

  private buildDescriptor(entries: UploadEntry[]): UploadDescriptor {
    const totalSize = entries.reduce((s, e) => s + e.size, 0);
    const hasRelativePath = entries.some((e) => e.relativePath && e.relativePath.includes("/"));
    let type: "file" | "files" | "folder";
    if (entries.length === 1 && !hasRelativePath) {
      type = "file";
    } else if (hasRelativePath) {
      type = "folder";
    } else {
      type = "files";
    }
    return { type, totalFiles: entries.length, totalSize, entries };
  }

  private async extractDropEntries(dataTransfer: DataTransfer | null): Promise<UploadEntry[]> {
    if (!dataTransfer) return [];
    const items = dataTransfer.items ? Array.from(dataTransfer.items) : [];
    if (!items.length) {
      return Array.from(dataTransfer.files || []).map((f) => ({
        file: f,
        size: f.size,
        relativePath: f.webkitRelativePath || null,
      }));
    }

    const entryPromises = items
      .filter((item) => item.kind === "file")
      .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
      .filter(Boolean)
      .map((entry) => this.traverseEntry(entry!, ""));

    const nested = await Promise.all(entryPromises);
    return nested.flat();
  }

  private async traverseEntry(entry: FileSystemEntry, prefix: string): Promise<UploadEntry[]> {
    if ((entry as FileSystemFileEntry).file) {
      const fileEntry = entry as FileSystemFileEntry;
      const file = await new Promise<File>((resolve, reject) => fileEntry.file(resolve, reject));
      return [{ file, size: file.size, relativePath: prefix + file.name }];
    }
    if ((entry as FileSystemDirectoryEntry).createReader) {
      const dirEntry = entry as FileSystemDirectoryEntry;
      const reader = dirEntry.createReader();
      const allChildren = await this.readAllEntries(reader);
      const allFiles: UploadEntry[] = [];
      for (const child of allChildren) {
        const childFiles = await this.traverseEntry(child, `${prefix}${dirEntry.name}/`);
        allFiles.push(...childFiles);
      }
      return allFiles;
    }
    return [];
  }

  private async readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
    const entries: FileSystemEntry[] = [];
    while (true) {
      const batch = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve));
      if (!batch.length) break;
      entries.push(...batch);
    }
    return entries;
  }
}

export function mount(el: HTMLElement, ctx: TinyFxContext) {
  const inst = new UploadDropzone(el, ctx);
  inst.init();
  return inst;
}
