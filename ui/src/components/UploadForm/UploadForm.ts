import { signal, effect } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";
import { UploadService } from "@services/upload.service";
import { toast } from "@state/toast.state";
import { folderNav } from "@state/folder-nav.state";
import { getUploadDescriptor, clearUploadDescriptor } from "@state/upload.state";

export class UploadForm {
  isUploading = signal<boolean>(false);

  constructor(public el: HTMLElement, public ctx: TinyFxContext) {}

  init(): void {
    const form = this.el as HTMLFormElement;
    const submitBtn = this.el.querySelector("[data-upload-submit]");
    const btnText = this.el.querySelector<HTMLElement>(".btn-text");
    const btnSpinner = this.el.querySelector<HTMLElement>(".btn-spinner");
    const displayNameInput = this.el.querySelector<HTMLInputElement>("[data-display-name]");
    const pinCodeInput = this.el.querySelector<HTMLInputElement>("[data-pin-code]");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const descriptor = getUploadDescriptor();

      if (!descriptor || !descriptor.entries.length) {
        toast.show("Please select files or a folder to upload", "error");
        return;
      }

      this.isUploading.set(true);
      if (btnText) btnText.style.display = "none";
      if (btnSpinner) btnSpinner.style.display = "inline-block";
      if (submitBtn) (submitBtn as HTMLButtonElement).disabled = true;

      try {
        await UploadService.upload(descriptor, {
          displayName: displayNameInput?.value,
          pinCode: pinCodeInput?.value,
          parentId: folderNav.getCurrentFolderID() !== folderNav.ROOT_ID
            ? folderNav.getCurrentFolderID()
            : undefined,
        });

        toast.show("Upload successful!", "success");
        clearUploadDescriptor();
        if (displayNameInput) displayNameInput.value = "";
        if (pinCodeInput) pinCodeInput.value = "";

        const event = new CustomEvent("upload:complete");
        this.el.dispatchEvent(event);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        toast.show(message, "error");
      } finally {
        this.isUploading.set(false);
        if (btnText) btnText.style.display = "";
        if (btnSpinner) btnSpinner.style.display = "none";
        if (submitBtn) (submitBtn as HTMLButtonElement).disabled = false;
      }
    });

    effect(() => {
      const uploading = this.isUploading();
      if (btnText) btnText.textContent = uploading ? "Uploading..." : "Upload File";
    });
  }
}

export function mount(el: HTMLElement, ctx: TinyFxContext) {
  const inst = new UploadForm(el, ctx);
  inst.init();
  return inst;
}
