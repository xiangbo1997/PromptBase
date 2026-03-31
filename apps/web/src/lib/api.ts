import { useAuthStore } from "@/stores/auth";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, resolveLocale, translate } from "@/lib/i18n";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { token, logout } = useAuthStore.getState();

  const headers = new Headers(options.headers);
  const hasBody = options.body !== undefined && options.body !== null;
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (hasBody && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    logout();
  }

  if (!response.ok) {
    const locale =
      typeof window === "undefined"
        ? DEFAULT_LOCALE
        : resolveLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY) ?? window.navigator.language);
    const error = await response.json().catch(() => ({ message: translate(locale, "common.unknownError") }));
    throw new Error(error.message ?? translate(locale, "common.requestFailed"));
  }

  const json = await response.json();

  // Unwrap API envelope: { success, data, meta } → data
  if (json && typeof json === "object" && "data" in json) {
    return json.data as T;
  }

  return json as T;
}
