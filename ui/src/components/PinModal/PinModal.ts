import { signal, effect } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";
import type { PinAction } from "@components/PinModal/PinModal";
import { pinModalState, pinCallback } from "@state/modal-callbacks.state";

export type { PinAction, PinActionType } from "@components/PinModal/PinModal";

export class PinModal {
  visible = signal<boolean>(false);
  title = signal<string>("Enter PIN");
  description = signal<string>("This item is protected. Please enter the PIN:");
  submitLabel = signal<string>("Download");
  pinValue = signal<string>("");
  private pendingAction: PinAction | null = null;

  constructor(public el: HTMLElement, public ctx: TinyFxContext) {}

  init(): void {
    effect(() => {
      const state = pinModalState();
      this.visible.set(state.visible);
      if (state.visible && state.action) {
        this.pendingAction = state.action;
        this.updateCopy(state.action.type);
        this.pinValue.set("");
        const input = this.el.querySelector<HTMLInputElement>("[data-pin-input]");
        if (input) {
          input.value = "";
          setTimeout(() => input.focus(), 50);
        }
      }
    });

    effect(() => {
      this.el.classList.toggle("show", this.visible());
      if (this.visible()) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    });

    effect(() => {
      const titleEl = this.el.querySelector(".modal-header h3");
      if (titleEl) titleEl.textContent = this.title();
    });

    effect(() => {
      const descEl = this.el.querySelector(".modal-body > p");
      if (descEl) descEl.textContent = this.description();
    });

    effect(() => {
      const submitBtn = this.el.querySelector("[data-action='submit']");
      if (submitBtn) submitBtn.textContent = this.submitLabel();
    });

    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) this.hide();
    });

    const closeBtn = this.el.querySelector("[data-action='close']");
    closeBtn?.addEventListener("click", () => this.hide());

    const cancelBtn = this.el.querySelector("[data-action='cancel']");
    cancelBtn?.addEventListener("click", () => this.hide());

    const submitBtn = this.el.querySelector("[data-action='submit']");
    submitBtn?.addEventListener("click", () => this.handleSubmit());

    const input = this.el.querySelector<HTMLInputElement>("[data-pin-input]");
    input?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleSubmit();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.visible()) this.hide();
    });
  }

  hide(): void {
    this.visible.set(false);
    this.pendingAction = null;
    this.pinValue.set("");
    pinModalState.set({ action: null, visible: false });
    pinCallback.set(null);
  }

  private handleSubmit(): void {
    const input = this.el.querySelector<HTMLInputElement>("[data-pin-input]");
    const pin = input?.value.trim() || "";
    if (!pin) return;
    const cb = pinCallback();
    if (this.pendingAction && cb) {
      cb(pin, this.pendingAction);
    }
  }

  private updateCopy(actionType: PinAction["type"]): void {
    const isFolderOpen = actionType === "folder-open";
    const isFolderDownload = actionType === "folder-download";

    if (isFolderOpen) {
      this.title.set("Enter PIN");
      this.description.set("This folder is protected. Please enter the PIN to open:");
      this.submitLabel.set("Open");
    } else if (isFolderDownload) {
      this.title.set("Enter PIN");
      this.description.set("This folder is protected. Please enter the PIN to download:");
      this.submitLabel.set("Download");
    } else {
      this.title.set("Enter PIN");
      this.description.set("This file is protected. Please enter the PIN to download:");
      this.submitLabel.set("Download");
    }
  }
}

export function mount(el: HTMLElement, ctx: TinyFxContext) {
  const inst = new PinModal(el, ctx);
  inst.init();
  return inst;
}
