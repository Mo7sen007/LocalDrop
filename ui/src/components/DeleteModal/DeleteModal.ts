import { signal, effect } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";
import { deleteModalState, deleteCallback } from "@state/modal-callbacks.state";

export class DeleteModal {
  visible = signal<boolean>(false);
  itemName = signal<string>("");
  itemType = signal<string>("file");

  constructor(public el: HTMLElement, public ctx: TinyFxContext) {}

  init(): void {
    effect(() => {
      const state = deleteModalState();
      this.visible.set(state.visible);
      if (state.visible) {
        this.itemName.set(state.name);
        this.itemType.set(state.type);
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
      const nameEl = this.el.querySelector(".file-name-display");
      if (nameEl) nameEl.textContent = this.itemName();
    });

    effect(() => {
      const typeEl = this.el.querySelector(".modal-body > p");
      if (typeEl) typeEl.textContent = `Are you sure you want to delete this ${this.itemType()}?`;
    });

    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) this.hide();
    });

    this.el.querySelector("[data-action='close']")?.addEventListener("click", () => this.hide());
    this.el.querySelector("[data-action='cancel']")?.addEventListener("click", () => this.hide());
    this.el.querySelector("[data-action='confirm']")?.addEventListener("click", () => this.handleConfirm());

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.visible()) this.hide();
    });
  }

  hide(): void {
    this.visible.set(false);
    deleteModalState.set({ name: "", type: "file", visible: false });
    deleteCallback.set(null);
  }

  private handleConfirm(): void {
    const cb = deleteCallback();
    if (cb) cb();
    this.hide();
  }
}

export function mount(el: HTMLElement, ctx: TinyFxContext) {
  const inst = new DeleteModal(el, ctx);
  inst.init();
  return inst;
}
