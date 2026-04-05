// index page

import { onMount, onDestroy } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";

export function init(el: HTMLElement, ctx: TinyFxContext): void {
  onMount(() => {
    console.log("[TinyFX] index page mounted");
  });

  onDestroy(() => {
    // cleanup: remove event listeners, cancel requests, etc.
  });
}
