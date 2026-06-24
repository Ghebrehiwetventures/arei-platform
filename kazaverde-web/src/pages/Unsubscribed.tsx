import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDocumentMeta } from "../hooks/useDocumentMeta";

/* /unsubscribed — confirmation landing for the email unsubscribe flow.
   The `unsubscribe` Edge Function does the work (verifies the signed token,
   sets is_active=false) then 302-redirects here with ?status and ?l, because
   Supabase sanitises any HTML served from the functions domain to plain text.
   This page only displays the outcome; it performs no mutation. */

type Lang = "en" | "pt";

const COPY: Record<Lang, {
  okHead: string; okBody: string;
  badHead: string; badBody: string;
  cta: string;
}> = {
  en: {
    okHead: "You're unsubscribed.",
    okBody: "You won't receive any more emails from the Cape Verde Real Estate Index. Changed your mind? You can subscribe again any time.",
    badHead: "Link expired or invalid.",
    badBody: "We couldn't verify this unsubscribe link. If you keep getting emails you didn't ask for, reply to any of them and we'll remove you.",
    cta: "Back to the site",
  },
  pt: {
    okHead: "Subscrição anulada.",
    okBody: "Não irá receber mais emails do Cape Verde Real Estate Index. Mudou de ideias? Pode subscrever novamente quando quiser.",
    badHead: "Ligação inválida ou expirada.",
    badBody: "Não foi possível verificar esta ligação. Se continuar a receber emails que não pediu, responda a qualquer um e iremos removê-lo.",
    cta: "Voltar ao site",
  },
};

export default function Unsubscribed() {
  const [params] = useSearchParams();
  const lang: Lang = params.get("l") === "pt" ? "pt" : "en";
  const ok = params.get("status") !== "invalid";
  const c = COPY[lang];
  const head = ok ? c.okHead : c.badHead;
  const body = ok ? c.okBody : c.badBody;

  useDocumentMeta(head, body);

  // Not a page we want indexed — it only exists as a redirect target.
  useEffect(() => {
    const el = document.createElement("meta");
    el.name = "robots";
    el.content = "noindex";
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);

  return (
    <div style={{ background: "var(--kv-off-white)", minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 24px" }}>
      <div style={{ maxWidth: 480, width: "100%", color: "var(--kv-black)" }}>
        <h1 style={{ margin: "0 0 16px", fontSize: 30, fontWeight: 600, letterSpacing: "-0.5px", lineHeight: 1.15 }}>{head}</h1>
        <p style={{ margin: "0 0 32px", fontSize: 16, color: "#3A3A3A", lineHeight: 1.6 }}>{body}</p>
        <Link
          to="/"
          style={{ display: "inline-block", background: "var(--kv-black)", color: "var(--kv-paper)", borderRadius: 2, padding: "14px 28px", fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}
        >
          {c.cta}
        </Link>
      </div>
    </div>
  );
}
