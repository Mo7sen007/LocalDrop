import { signal } from "@tinyfx/runtime";
import type { UploadDescriptor } from "@services/upload.service";

export const uploadDescriptor = signal<UploadDescriptor | null>(null);

export function setUploadDescriptor(desc: UploadDescriptor | null): void {
  uploadDescriptor.set(desc);
}

export function getUploadDescriptor(): UploadDescriptor | null {
  return uploadDescriptor();
}

export function clearUploadDescriptor(): void {
  uploadDescriptor.set(null);
}
