import { onMount } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";

export function init(el: HTMLElement, ctx: TinyFxContext): void {
  onMount(() => {
    console.log("[LocalDrop] Config page mounted");
  });
}
