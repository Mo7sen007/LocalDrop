import { effect, signal } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";
import { AuthService } from "@services/auth.service";
import { authState } from "@state/auth.state";

export interface NavLink {
  label: string;
  url: string;
  active: boolean;
}

export class Navbar {
  private readonly isLoggedIn = signal<boolean>(false);
  private readonly links: NavLink[] = [
    { label: "Files", url: "/", active: false },
    { label: "Dashboard", url: "/dashboard", active: false },
    { label: "Config", url: "/config", active: false },
  ];

  constructor(public el: HTMLElement, public ctx: TinyFxContext) {}

  init(): void {
    const loginBtn = this.el.querySelector<HTMLAnchorElement>("#loginBtn");
    const logoutBtn = this.el.querySelector<HTMLButtonElement>("#logoutBtn");

    this.isLoggedIn.set(authState().loggedIn);

    effect(() => {
      this.isLoggedIn.set(authState().loggedIn);
    });

    const render = () => {
      const loggedIn = this.isLoggedIn();
      this.renderLinks(loggedIn);
      if (loginBtn) loginBtn.hidden = loggedIn;
      if (logoutBtn) logoutBtn.hidden = !loggedIn;
    };

    render();

    effect(() => {
      this.isLoggedIn();
      render();
    });

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => AuthService.logout());
    }
  }

  private renderLinks(loggedIn: boolean): void {
    const nav = this.el.querySelector<HTMLElement>("[data-nav-links]");
    if (!nav) return;

    nav.querySelectorAll("a[data-nav-link]").forEach((node) => node.remove());

    const visibleLinks = loggedIn ? this.links : [];

    const loginBtn = nav.querySelector("#loginBtn");
    const currentPath = window.location.pathname;
    visibleLinks.forEach((link) => {
      const anchor = document.createElement("a");
      anchor.setAttribute("data-nav-link", "true");
      anchor.href = link.url;
      const isActive = currentPath === link.url;
      anchor.className = isActive ? "nav-link active" : "nav-link";
      anchor.textContent = link.label;
      if (loginBtn) {
        nav.insertBefore(anchor, loginBtn);
      } else {
        nav.appendChild(anchor);
      }
    });
  }
}

export function mount(el: HTMLElement, ctx: TinyFxContext) {
  const inst = new Navbar(el, ctx);
  inst.init();
  return inst;
}
