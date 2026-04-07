import { onMount } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";
import { AuthService } from "@services/auth.service";

export interface NavLink {
  label: string;
  url: string;
  active: boolean;
}

export class Navbar {
  constructor(public el: HTMLElement, public ctx: TinyFxContext) {}

  init(): void {
    const logoutBtn = this.el.querySelector("#logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => AuthService.logout());
    }
  }
}

export function mount(el: HTMLElement, ctx: TinyFxContext) {
  const inst = new Navbar(el, ctx);
  inst.init();
  return inst;
}
