import { createHttp } from "@tinyfx/runtime";
import { API_BASE } from "@config";

export const http = createHttp({ baseUrl: API_BASE });

const originalFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const nextInit: RequestInit = {
    credentials: "include",
    ...init,
  };
  return originalFetch(input, nextInit);
};

export function triggerDownload(url: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
