import { http } from "@services/http";
import { SessionService } from "@services/session.service";

export const AuthService = {
  async login(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const response = await fetch("/login", {
        method: "POST",
        body: new URLSearchParams({ username, password }),
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        credentials: "include",
        redirect: "follow",
      });
      if (!response.ok) {
        let errorMsg = "Login failed";
        try {
          const text = await response.text();
          if (text) errorMsg = text;
        } catch {
          /* ignore */
        }
        return { ok: false, error: errorMsg };
      }
      await SessionService.checkAuth();
      if (!response.redirected && !response.url.includes("/dashboard")) {
        return { ok: false, error: "Login failed" };
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Login failed" };
    }
  },

  async logout(): Promise<void> {
    try {
      await http.post("/logout");
    } catch {
      /* ignore */
    }
    SessionService.markLoggedOut();
    window.location.href = "/login";
  },
};
