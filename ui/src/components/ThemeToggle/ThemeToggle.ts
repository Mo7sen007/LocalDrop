// ThemeToggle component

import { effect } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";
import { theme } from "@state/theme.state";

export class ThemeToggle {
  private icon: HTMLElement | null = null;

  constructor(public el: HTMLElement, public ctx: TinyFxContext) {}

  init(): void {
    this.icon = this.el.querySelector("i");

    effect(() => {
      const isDark = theme() === "dark";
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", theme());
      }
      if (this.icon) {
        this.icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
      }
    });

    this.el.addEventListener("click", () => {
      theme.set(theme() === "dark" ? "light" : "dark");
    });
  }

  destroy?(): void {
    // no-op: listeners bound to this.el will be cleaned up when element is removed
  }
}

export function mount(el: HTMLElement, ctx: TinyFxContext) {
  const inst = new ThemeToggle(el, ctx);
  inst.init();
  return inst;
}
