import { signal } from "@tinyfx/runtime";
import type { PinAction } from "@components/PinModal/PinModal";

export const deleteCallback = signal<(() => void) | null>(null);
export const pinCallback = signal<((pin: string, action: PinAction) => void) | null>(null);

export const deleteModalState = signal<{ name: string; type: "file" | "folder"; visible: boolean }>({
  name: "",
  type: "file",
  visible: false,
});

export const pinModalState = signal<{ action: PinAction | null; visible: boolean }>({
  action: null,
  visible: false,
});

export const shareModalState = signal<{ url: string; visible: boolean }>({
  url: "",
  visible: false,
});
