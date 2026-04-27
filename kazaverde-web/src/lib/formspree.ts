const FORMSPREE_ENDPOINT = "https://formspree.io/f/mkokakbg";

export async function notifyFormspree(payload: {
  email: string;
  source: string;
  [key: string]: string;
}): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        ...payload,
        _subject: `KazaVerde: ${payload.source} — ${payload.email}`,
      }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}
