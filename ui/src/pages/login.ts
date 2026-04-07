import { onMount, signal } from "@tinyfx/runtime";
import type { TinyFxContext } from "@tinyfx/runtime";
import { AuthService } from "@services/auth.service";

export function init(el: HTMLElement, ctx: TinyFxContext): void {
  const isLoading = signal<boolean>(false);

  onMount(() => {
    const form = el.querySelector<HTMLFormElement>("[data-login-form]");
    const usernameInput = el.querySelector<HTMLInputElement>("[data-username]");
    const passwordInput = el.querySelector<HTMLInputElement>("[data-password]");
    const submitBtn = el.querySelector("[data-login-submit]");
    const btnText = el.querySelector<HTMLElement>(".btn-text");
    const btnSpinner = el.querySelector<HTMLElement>(".btn-spinner");
    const errorEl = el.querySelector<HTMLElement>("[data-error-msg]");

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const username = usernameInput?.value.trim() || "";
      const password = passwordInput?.value.trim() || "";

      if (!username || !password) {
        showError("Please fill in all fields");
        return;
      }

      setLoading(true);

      try {
        const result = await AuthService.login(username, password);
        if (result.ok) {
          showSuccess("Login successful! Redirecting...");
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1000);
        } else {
          showError(result.error || "Login failed");
        }
      } catch {
        showError("Error connecting to server. Please try again.");
      } finally {
        setLoading(false);
      }
    });

    [usernameInput, passwordInput].forEach((input) => {
      input?.addEventListener("input", () => {
        if (errorEl?.classList.contains("show") && !errorEl.classList.contains("success")) {
          errorEl.classList.remove("show");
        }
      });
    });

    passwordInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        form?.dispatchEvent(new Event("submit"));
      }
    });

    function setLoading(loading: boolean): void {
      isLoading.set(loading);
      if (submitBtn) (submitBtn as HTMLButtonElement).disabled = loading;
      if (btnText) btnText.style.display = loading ? "none" : "";
      if (btnSpinner) btnSpinner.style.display = loading ? "inline-block" : "none";
    }

    function showError(message: string): void {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.remove("success");
      errorEl.classList.add("show");
      setTimeout(() => errorEl.classList.remove("show"), 5000);
    }

    function showSuccess(message: string): void {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.classList.add("success", "show");
    }
  });
}
