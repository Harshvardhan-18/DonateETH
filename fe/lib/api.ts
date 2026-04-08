export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5003").replace(
  /\/+$/,
  ""
);

export function apiUrl(pathname: string): string {
  if (!pathname) return API_BASE_URL;
  if (/^https?:\/\//i.test(pathname)) return pathname;
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${API_BASE_URL}${normalized}`;
}

export function assetUrl(value: string | null | undefined): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return apiUrl(value);
}
