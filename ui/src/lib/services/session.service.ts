import { authState } from "@state/auth.state";

interface AuthStatusDto {
  loggedIn?: boolean;
  authEnabled?: boolean;
  user?: string;
}

export const SessionService = {
  async checkAuth(): Promise<void> {
    try {
      const response = await fetch("/auth/status", { credentials: "include" });
      if (!response.ok) {
        throw new Error("auth status failed");
      }
      const status = (await response.json()) as AuthStatusDto;
      authState.set({
        checked: true,
        loggedIn: !!status?.loggedIn,
        authEnabled: !!status?.authEnabled,
        user: status?.user || "",
      });
    } catch {
      authState.set({
        checked: true,
        loggedIn: false,
        authEnabled: false,
        user: "",
      });
    }
  },

  markLoggedOut(): void {
    authState.set({
      checked: true,
      loggedIn: false,
      authEnabled: authState().authEnabled,
      user: "",
    });
  },
};
