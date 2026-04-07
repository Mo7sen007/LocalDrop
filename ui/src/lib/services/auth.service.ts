import { http } from "@services/http";

export const AuthService = {
  async login(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    try {
      await http.post("/login", new URLSearchParams({ username, password }), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      return { ok: true };
    } catch (err) {
      let errorMsg = "Login failed";
      if (err && typeof err === "object" && "response" in err) {
        try {
          const text = await ((err as Record<string, unknown>).response as Response).text();
          if (text) errorMsg = text;
        } catch {
          /* ignore */
        }
      }
      return { ok: false, error: errorMsg };
    }
  },

  async logout(): Promise<void> {
    try {
      await http.post("/logout");
    } catch {
      /* ignore */
    }
    window.location.href = "/login";
  },
};
