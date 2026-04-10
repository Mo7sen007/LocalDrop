import { signal, effect } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";
import { shareModalState } from "@state/modal-callbacks.state";
import qrcode from "@services/qrcode.vendor.js";

export class ShareModal {
  visible = signal<boolean>(false);
  shareUrl = signal<string>("");
  qrDataUrl = signal<string>("");

  constructor(public el: HTMLElement, public ctx: TinyFxContext) {}

  init(): void {
    effect(() => {
      const state = shareModalState();
      this.visible.set(state.visible);
      if (state.visible) {
        this.shareUrl.set(state.url);
      } else {
        this.qrDataUrl.set("");
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
      if (!qrContainer) return;

      if (!this.visible() || !this.shareUrl()) {
        qrContainer.innerHTML = "";
        return;
      }

      const dataUrl = this.getQrDataUrl(this.shareUrl());
      this.qrDataUrl.set(dataUrl);

      qrContainer.innerHTML = "";
      if (!dataUrl) {
        qrContainer.textContent = this.shareUrl();
        return;
      }

      const img = document.createElement("img");
      img.src = dataUrl;
      img.width = 240;
      img.height = 240;
      img.alt = "QR code for share link";
      img.loading = "eager";
      img.decoding = "async";
      img.onerror = () => {
        qrContainer.textContent = this.shareUrl();
      };
      qrContainer.appendChild(img);
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
    this.qrDataUrl.set("");
    shareModalState.set({ url: "", visible: false });
  }

  private getQrDataUrl(value: string): string {
    try {
      const qr = qrcode(0, "M");
      qr.addData(value, "Byte");
      qr.make();
      return qr.createDataURL(6, 2);
    } catch {
      return "";
    }
  }
}

export function mount(el: HTMLElement, ctx: TinyFxContext) {
  const inst = new ShareModal(el, ctx);
  inst.init();
  return inst;
}
