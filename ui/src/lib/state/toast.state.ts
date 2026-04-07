import { signal, effect } from "@tinyfx/runtime";

export type ToastType = "success" | "error" | "info";

interface ToastData {
  message: string;
  type: ToastType;
  visible: boolean;
}

const toastData = signal<ToastData>({
  message: "",
  type: "info",
  visible: false,
});

let hideTimeout: ReturnType<typeof setTimeout> | null = null;

export const toast = {
  message: () => toastData().message,
  type: () => toastData().type,
  visible: () => toastData().visible,

  show(message: string, type: ToastType = "info"): void {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
    }

    toastData.set({ message, type, visible: true });

    hideTimeout = setTimeout(() => {
      toastData.set({ ...toastData(), visible: false });
    }, 3000);
  },

  hide(): void {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    toastData.set({ ...toastData(), visible: false });
  },
};
