import { useState, useEffect } from "react";
import "./CookieBanner.css";

const STORAGE_KEY = "kv_cookie_ack";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Small delay so it doesn't flash on first paint
        const t = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(t);
      }
    } catch {
      // localStorage unavailable — don't show
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // silent
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="ck-shell">
      <div className="ck-banner" role="dialog" aria-label="Cookie notice" aria-live="polite">
        <div className="ck-copy">
          <span className="ck-eyebrow">Privacy note</span>
          <p className="ck-text">
            This site uses localStorage and cookieless analytics to understand how visitors use the site. No advertising trackers.
          </p>
        </div>
        <button className="ck-btn" onClick={accept} type="button">
          Got it
        </button>
      </div>
    </div>
  );
}
