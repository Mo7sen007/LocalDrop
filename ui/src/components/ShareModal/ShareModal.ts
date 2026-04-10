import { signal, effect } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";
import { shareModalState } from "@state/modal-callbacks.state";

function buildQrImageUrl(value: string): string {
  const encoded = encodeURIComponent(value);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encoded}`;
}

export class ShareModal {
  visible = signal<boolean>(false);
  shareUrl = signal<string>("");

  constructor(public el: HTMLElement, public ctx: TinyFxContext) {}

  init(): void {
    effect(() => {
      const state = shareModalState();
      this.visible.set(state.visible);
      if (state.visible) {
        this.shareUrl.set(state.url);
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
      const input = this.el.querySelector<HTMLInputElement>("[data-share-url]");
      if (input) input.value = this.shareUrl();
    });

    effect(() => {
      const qrContainer = this.el.querySelector<HTMLElement>("[data-qr]");
      if (qrContainer && this.visible() && this.shareUrl()) {
        qrContainer.innerHTML = "";
        const img = document.createElement("img");
        img.src = buildQrImageUrl(this.shareUrl());
        img.width = 240;
        img.height = 240;
        img.alt = "QR code for share link";
        img.loading = "eager";
        img.referrerPolicy = "no-referrer";
        img.onerror = () => {
          qrContainer.textContent = this.shareUrl();
        };
        qrContainer.appendChild(img);
      }
    });

    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) this.hide();
    });

    this.el.querySelector("[data-action='close']")?.addEventListener("click", () => this.hide());

    this.el.querySelector("[data-action='copy']")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(this.shareUrl());
        const input = this.el.querySelector<HTMLInputElement>("[data-share-url]");
        if (input) {
          input.style.background = "#d1fae5";
          setTimeout(() => { input.style.background = ""; }, 800);
        }
      } catch {
        /* ignore */
      }
    });

    this.el.querySelector("[data-action='native-share']")?.addEventListener("click", async () => {
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url: this.shareUrl() });
        } catch {
          /* user cancelled */
        }
      } else {
        try {
          await navigator.clipboard.writeText(this.shareUrl());
        } catch {
          /* ignore */
        }
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.visible()) this.hide();
    });
  }

  hide(): void {
    this.visible.set(false);
    shareModalState.set({ url: "", visible: false });
  }
}

export function mount(el: HTMLElement, ctx: TinyFxContext) {
  const inst = new ShareModal(el, ctx);
  inst.init();
  return inst;
}
