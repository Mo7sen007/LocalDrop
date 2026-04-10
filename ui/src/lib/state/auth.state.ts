import { signal } from "@tinyfx/runtime";

export interface AuthState {
  checked: boolean;
  loggedIn: boolean;
  authEnabled: boolean;
  user: string;
}

export const authState = signal<AuthState>({
  checked: false,
  loggedIn: false,
  authEnabled: false,
  user: "",
});
