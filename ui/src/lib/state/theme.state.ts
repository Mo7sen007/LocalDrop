// Global theme state — read and written by any component that needs it

import { signal } from "@tinyfx/runtime";

export type Theme = "light" | "dark";

const prefersDark = typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

export const theme = signal<Theme>(prefersDark ? "dark" : "light");
