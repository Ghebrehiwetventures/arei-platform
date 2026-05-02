import { supabaseAuth } from "./supabase";
import type { AreiPulseApiResponse } from "./areiPulseTypes";

async function getAdminAccessToken(): Promise<string | null> {
  const { data } = await supabaseAuth.auth.getSession();
  return data.session?.access_token ?? null;
}

async function requestPulse(method: "GET" | "POST"): Promise<AreiPulseApiResponse> {
  const token = await getAdminAccessToken();
  const response = await fetch("/api/arei-pulse", {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const payload = (await response.json().catch(() => null)) as AreiPulseApiResponse | { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload && "error" in payload && payload.error ? payload.error : "AREI Pulse request failed");
  }

  return payload as AreiPulseApiResponse;
}

export function getLatestAreiPulse(): Promise<AreiPulseApiResponse> {
  return requestPulse("GET");
}

export function generateAreiPulse(): Promise<AreiPulseApiResponse> {
  return requestPulse("POST");
}
