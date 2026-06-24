import { createClient } from "jsr:@supabase/supabase-js@2";
import { makeUnsubToken } from "../_shared/unsubscribe-token.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, apikey",
};

const SUBJECT = {
  en: "You're subscribed to Cape Verde Real Estate Index",
  pt: "Subscrição confirmada — Cape Verde Real Estate Index",
} as const;

// Welcome email — single language per locale, flat off-white surface matching
// the live /subscribe page (kazaverde-web/src/pages/MarketUpdates.{tsx,css}).
// Lockup, type, colours and copy mirror that page 1:1. Do not redraw the mark
// from memory — geometry comes from kazaverde-web/src/components/DLayersMark.tsx.
const FONT = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const COPY = {
  en: {
    lang: "en",
    title: "You're subscribed to Cape Verde Real Estate Index",
    heading: "You're subscribed.",
    p1: "Thanks for joining the Cape Verde Real Estate Index.",
    p2: "We'll send new listings, island updates and simple market notes &mdash; straight to your inbox, no noise.",
    cta: "Browse all listings",
    foot1: "Cape Verde Real Estate Index is not a broker. We collect public listings from local agencies, portals and property websites so buyers can understand the market more easily.",
    foot2pre: "You're getting this because you subscribed at capeverderealestateindex.com. ",
    unsub: "Unsubscribe",
  },
  pt: {
    lang: "pt",
    title: "Subscri&ccedil;&atilde;o confirmada &mdash; Cape Verde Real Estate Index",
    heading: "Subscri&ccedil;&atilde;o confirmada.",
    p1: "Obrigado por subscrever o Cape Verde Real Estate Index.",
    p2: "Enviaremos novos im&oacute;veis, atualiza&ccedil;&otilde;es por ilha e notas simples sobre o mercado &mdash; diretamente para a sua caixa de entrada, sem ru&iacute;do.",
    cta: "Ver todos os im&oacute;veis",
    foot1: "O Cape Verde Real Estate Index n&atilde;o &eacute; uma imobili&aacute;ria. Recolhemos an&uacute;ncios p&uacute;blicos de ag&ecirc;ncias locais, portais e sites imobili&aacute;rios para que os compradores compreendam melhor o mercado.",
    foot2pre: "Est&aacute; a receber isto porque se subscreveu em capeverderealestateindex.com. ",
    unsub: "Anular subscri&ccedil;&atilde;o",
  },
} as const;

function welcomeHtml(locale: Locale, unsubUrl: string): string {
  const c = COPY[locale];
  return `<!DOCTYPE html>
<html lang="${c.lang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <!-- Light-only: stop Apple Mail / Outlook dark mode from inverting the warm
       off-white surface into near-black (the design is intentionally light). -->
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${c.title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    :root { color-scheme: light; supported-color-schemes: light; }
    * { margin:0; padding:0; box-sizing:border-box; }
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    a { text-decoration:none; }
  </style>
</head>
<body bgcolor="#F2F0EC" style="margin:0;padding:0;background-color:#F2F0EC;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F2F0EC" style="background-color:#F2F0EC;">
<tr><td align="center" style="padding:48px 24px 56px;">

  <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;">

    <!-- Lockup: mark + wordmark (mirrors the /subscribe footer lockup) -->
    <tr><td style="padding-bottom:44px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="vertical-align:middle;padding-right:13px;line-height:0;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="3" y="3" width="14" height="14" stroke="#0A0A0A" stroke-width="1.4" stroke-linecap="square"/>
              <rect x="6.5" y="6.5" width="14" height="14" stroke="#0A0A0A" stroke-width="1.4" stroke-linecap="square"/>
              <rect x="10" y="10" width="9" height="9" fill="#0A0A0A"/>
            </svg>
          </td>
          <td style="vertical-align:middle;">
            <span style="font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#0A0A0A;">Cape&nbsp;Verde</span>
            <span style="font-family:${FONT};font-size:12px;font-weight:400;letter-spacing:0.08em;text-transform:uppercase;color:#5E5D5B;">&nbsp;Real&nbsp;Estate&nbsp;Index</span>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- Headline -->
    <tr><td style="padding-bottom:20px;">
      <h1 style="margin:0;font-family:${FONT};font-size:34px;font-weight:600;letter-spacing:-0.6px;color:#0A0A0A;line-height:1.12;">${c.heading}</h1>
    </td></tr>

    <!-- Body -->
    <tr><td style="padding-bottom:16px;">
      <p style="margin:0;font-family:${FONT};font-size:16px;color:#3A3A3A;line-height:1.6;">${c.p1}</p>
    </td></tr>
    <tr><td style="padding-bottom:32px;">
      <p style="margin:0;font-family:${FONT};font-size:16px;color:#3A3A3A;line-height:1.6;">${c.p2}</p>
    </td></tr>

    <!-- CTA -->
    <tr><td style="padding-bottom:40px;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td bgcolor="#0A0A0A" style="background-color:#0A0A0A;border-radius:2px;">
          <a href="https://capeverderealestateindex.com/listings" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#FFFFFF;text-decoration:none;">${c.cta}</a>
        </td></tr>
      </table>
    </td></tr>

    <!-- Divider -->
    <tr><td style="padding-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="border-top:1px solid #E2E0DB;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td style="padding-bottom:10px;">
      <p style="margin:0;font-family:${FONT};font-size:12px;color:#8A8884;line-height:1.6;">${c.foot1}</p>
    </td></tr>
    <tr><td style="padding-bottom:18px;">
      <p style="margin:0;font-family:${FONT};font-size:12px;color:#8A8884;line-height:1.6;">${c.foot2pre}<a href="${unsubUrl}" style="color:#5E5D5B;text-decoration:underline;">${c.unsub}</a>.</p>
    </td></tr>
    <tr><td>
      <p style="margin:0;font-family:${FONT};font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#AFADA8;line-height:1.6;">&copy; 2026 &middot; <a href="https://www.africarealestateindex.com/" style="color:#AFADA8;text-decoration:none;">Powered by Africa Real Estate Index</a></p>
    </td></tr>

  </table>

</td></tr>
</table>

</body>
</html>`;
}

type Locale = keyof typeof SUBJECT;

// Reduce PII before writing to admin_notifications (broadly readable). Keeps the
// first local-part char + domain: "mikael@gmail.com" → "m•••@gmail.com".
function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "•••";
  return `${email[0]}•••@${email.slice(at + 1)}`;
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }
  if (req.method !== "POST") {
    return jsonError(405, "Method not allowed");
  }

  let body: { email?: unknown; locale?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError(400, "Invalid email address");
  }

  const locale: Locale = body.locale === "pt" ? "pt" : "en";

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  const { data: inserted, error: insertError } = await sb
    .from("newsletter_subscribers")
    .insert({ email, locale })
    .select("id")
    .single();

  const alreadySubscribed = insertError?.code === "23505";
  if (insertError && !alreadySubscribed) {
    console.error("[subscribe] insert error:", insertError.message);
    return jsonError(500, "Failed to save subscriber");
  }

  // Re-subscribe after an unsubscribe: reactivate the existing row. No welcome
  // email re-send (they're already on the list), just flip is_active back on.
  if (alreadySubscribed) {
    const { error: reactivateError } = await sb
      .from("newsletter_subscribers")
      .update({ is_active: true })
      .eq("email", email);
    if (reactivateError) {
      console.warn("[subscribe] reactivate error:", reactivateError.message);
    }
  }

  if (!alreadySubscribed) {
    // Admin Notification Center: surface the new subscriber in the admin UI and
    // feed the weekly digest. Best-effort — a notification failure must never
    // break signup. See migration 036 / scripts/lib/notifications.ts.
    //
    // PII: admin_notifications is readable by ANY authenticated user (migration
    // 036 SELECT policy is `using (true)`), which now includes agency/broker
    // users (migration 039). So we store a MASKED email + the subscriber's id —
    // never the raw address. Full detail stays in newsletter_subscribers
    // (service-role only).
    const { error: notifyError } = await sb.from("admin_notifications").insert({
      event_type: "newsletter.new_subscriber",
      severity: "info",
      title: "New newsletter subscriber",
      body: `${maskEmail(email)} · ${locale.toUpperCase()}`,
      entity_type: "newsletter_subscriber",
      entity_id: inserted?.id ?? null,
      meta: { locale, source: "registration" },
    });
    if (notifyError) {
      console.warn("[subscribe] admin notification error:", notifyError.message);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM") ?? "Cape Verde Real Estate Index <hello@capeverderealestateindex.com>";

    // Signed unsubscribe link → the unsubscribe Edge Function (same project).
    const token = await makeUnsubToken(email);
    const fnBase = `${Deno.env.get("SUPABASE_URL")}/functions/v1/unsubscribe`;
    const unsubUrl = `${fnBase}?token=${encodeURIComponent(token)}&l=${locale}`;

    if (resendKey) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: SUBJECT[locale],
          html: welcomeHtml(locale, unsubUrl),
          // RFC 8058 one-click unsubscribe → Gmail/Apple show a native button.
          headers: {
            "List-Unsubscribe": `<${unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });
      if (!emailRes.ok) {
        console.warn("[subscribe] Resend error:", await emailRes.text());
      }
    } else {
      console.warn("[subscribe] RESEND_API_KEY not set — welcome email skipped");
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
