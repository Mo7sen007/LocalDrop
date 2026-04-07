import { effect } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";
import { toast } from "@state/toast.state";

export class Toast {
  constructor(public el: HTMLElement, public ctx: TinyFxContext) {}

  init(): void {
    effect(() => {
      const msg = toast.message();
      const type = toast.type();
      const visible = toast.visible();

      this.el.classList.toggle("show", visible);
      this.el.classList.remove("success", "error", "info");
      this.el.classList.add(type);

      const iconEl = this.el.querySelector(".toast-icon");
      if (iconEl) {
        if (type === "success") {
          iconEl.textContent = "\u2713";
        } else if (type === "error") {
          iconEl.textContent = "\u2717";
        } else {
          iconEl.textContent = "\u2139";
        }
      }

      const msgEl = this.el.querySelector(".toast-message");
      if (msgEl) {
        msgEl.textContent = msg;
      }
    });
  }
}

export function mount(el: HTMLElement, ctx: TinyFxContext) {
  const inst = new Toast(el, ctx);
  inst.init();
  return inst;
}
