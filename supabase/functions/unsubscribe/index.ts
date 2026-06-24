import { createClient } from "jsr:@supabase/supabase-js@2";
import { verifyUnsubToken } from "../_shared/unsubscribe-token.ts";

// Public unsubscribe endpoint. Two entry points:
//   GET  ?token=…&l=en|pt  — browser click from the email link
//   POST ?token=…          — one-click (RFC 8058, List-Unsubscribe-Post)
// Either way: verify the HMAC token, flip is_active=false. No auth (verify_jwt
// off in config.toml) — the token IS the authorization.
//
// For GET we 302-redirect to a confirmation page on the marketing site, because
// Supabase sanitises any HTML served from the *.supabase.co functions domain to
// plain text (anti-phishing). The site page only displays the outcome.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

const SITE_URL = Deno.env.get("SITE_URL") ?? "https://capeverderealestateindex.com";

function redirect(status: "ok" | "invalid", lang: string): Response {
  const to = `${SITE_URL}/unsubscribed?status=${status}&l=${lang === "pt" ? "pt" : "en"}`;
  return new Response(null, { status: 302, headers: { ...CORS, Location: to } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const lang = url.searchParams.get("l") ?? "en";
  const oneClick = req.method === "POST";

  const email = token ? await verifyUnsubToken(token) : null;
  if (!email) {
    if (oneClick) return new Response("invalid token", { status: 400, headers: CORS });
    return redirect("invalid", lang);
  }

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { error } = await sb
    .from("newsletter_subscribers")
    .update({ is_active: false })
    .eq("email", email);

  if (error) {
    console.error("[unsubscribe] update error:", error.message);
    if (oneClick) return new Response("error", { status: 500, headers: CORS });
    return redirect("invalid", lang);
  }

  // One-click (RFC 8058) expects a bare 2xx, no body.
  if (oneClick) return new Response(null, { status: 204, headers: CORS });
  return redirect("ok", lang);
});
