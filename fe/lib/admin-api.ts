import { apiUrl } from "./api";

export type AdminLoginPayload = { email: string; password: string };

export async function adminLogin(payload: AdminLoginPayload) {
  const response = await fetch(apiUrl("/admin/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Admin login failed");
  }

  return response.json();
}

export async function adminGet(path: string, token: string) {
  const response = await fetch(apiUrl(`/admin${path}`), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Request failed: ${path}`);
  return response.json();
}

export async function adminPatch(path: string, token: string, body: Record<string, unknown>) {
  const response = await fetch(apiUrl(`/admin${path}`), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Patch failed: ${path}`);
  return response.json();
}

export async function adminPost(path: string, token: string, body: Record<string, unknown> = {}) {
  const response = await fetch(apiUrl(`/admin${path}`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Post failed: ${path}`);
  return response.json();
}
