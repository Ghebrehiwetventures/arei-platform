// HMAC-signed unsubscribe tokens. Stateless — no DB column needed: the token
// is `base64url(email).base64url(HMAC-SHA256(email))`, so the unsubscribe
// function can recover and verify the email without a lookup table.
//
// Signing key: UNSUBSCRIBE_SECRET if set, else the service-role key (always
// present in the function env, never leaves the server). The token only guards
// against one person unsubscribing another, so deriving from an existing
// high-entropy secret is acceptable; set UNSUBSCRIBE_SECRET to rotate.

const enc = new TextEncoder();

function b64urlBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlStr(str: string): string {
  return b64urlBytes(enc.encode(str));
}

function b64urlDecodeToStr(s: string): string {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = norm.length % 4 ? "=".repeat(4 - (norm.length % 4)) : "";
  return atob(norm + pad);
}

function signingSecret(): string {
  return Deno.env.get("UNSUBSCRIBE_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
}

async function hmac(message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return new Uint8Array(sig);
}

export async function makeUnsubToken(email: string): Promise<string> {
  const sig = await hmac(email);
  return `${b64urlStr(email)}.${b64urlBytes(sig)}`;
}

/** Returns the verified email, or null if the token is malformed / forged. */
export async function verifyUnsubToken(token: string): Promise<string | null> {
  const dot = token.lastIndexOf(".");
  if (dot < 1 || dot === token.length - 1) return null;

  let email: string;
  try {
    email = b64urlDecodeToStr(token.slice(0, dot));
  } catch {
    return null;
  }

  const provided = token.slice(dot + 1);
  const expected = b64urlBytes(await hmac(email));

  // Constant-time-ish comparison.
  if (provided.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0 ? email : null;
}
