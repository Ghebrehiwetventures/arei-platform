#!/usr/bin/env node
/**
 * server.js — local experimentation UI for the CVREI news hero.
 *
 * A tiny zero-dependency preview server: type a headline / category / dek,
 * pick an image (default, URL, or AI), and see the rendered post + a suggested
 * caption live. This is the experimentation harness AND the basis for the
 * admin integration later.
 *
 * Run:  node server.js   →   open http://localhost:4321
 *       (set OPENAI_API_KEY in env to enable the "AI image" option)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { renderHero } = require('./hero');

const PORT = process.env.PORT || 4321;
const DEFAULT_PHOTO = path.join(__dirname, 'photo.jpg');

const CATEGORIES = ['Aviation', 'Real Estate', 'Tourism', 'Policy', 'Infrastructure', 'Market News'];

// Per-category visual motif — keeps AI imagery relevant to the topic without
// faking a specific real place (brand rule: theme, not fake landmarks).
const MOTIFS = {
  Aviation: 'an airliner in flight over the Atlantic, or an aerial view of a coastal runway and turquoise sea',
  'Real Estate': 'coastal low-rise architecture and new residential development along a tropical shoreline',
  Tourism: 'a calm tropical Atlantic beach and coastline at golden hour',
  Policy: 'a clean civic/government building exterior with calm, neutral framing',
  Infrastructure: 'a port, harbour cranes or a coastal road seen from above',
  'Market News': 'a wide aerial view of a tropical Atlantic island coastline',
};

// Build a relevant, textless, on-brand image prompt FROM the news content.
function buildImagePrompt(item) {
  const motif = MOTIFS[item.category] || MOTIFS['Market News'];
  return [
    `Editorial documentary news photograph illustrating the story: "${item.headline}".`,
    `Show ${motif}.`,
    'Cinematic natural light, muted editorial color grade, high detail, realistic.',
    'No text, no logos, no signage, no readable writing, no recognizable real landmarks, no people in focus.',
  ].join(' ');
}

// Suggested caption (template — the admin will use the LLM caption from
// social-market-news.js; this mirrors the recipe formula).
function suggestCaption({ headline, dek, category }) {
  const tags = ['#capeverde', '#caboverde', '#realestate', '#marketnews', '#' + category.toLowerCase().replace(/\s+/g, '')];
  return `${headline}.\n\n${dek}\n\nFull briefing → link in bio.\n\n[Image: AI illustration]\n${tags.join(' ')}`;
}

async function getImageBuffer(item, useAi) {
  // AI path: relevant prompt derived from the news (or an explicit override).
  if (useAi && process.env.OPENAI_API_KEY) {
    const prompt = (item.aiPrompt && item.aiPrompt.trim()) || buildImagePrompt(item);
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1536', quality: 'high', n: 1 }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const j = await res.json();
    return Buffer.from(j.data[0].b64_json, 'base64');
  }
  if (item.imageUrl) {
    const res = await fetch(item.imageUrl);
    if (!res.ok) throw new Error(`Image fetch ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFileSync(DEFAULT_PHOTO);
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page({ item = {}, imgData, caption, error, promptUsed } = {}) {
  const opts = CATEGORIES.map(c => `<option ${item.category === c ? 'selected' : ''}>${c}</option>`).join('');
  const derived = item.headline ? buildImagePrompt(item) : '';
  return `<!doctype html><html><head><meta charset="utf8"><title>CVREI · News Post Studio</title>
<style>
  :root{--ink:#0A0A0A;--bone:#FAFAFA;--sage:#8ECFBF;--deep:#2D4A42;--gray:#888}
  *{box-sizing:border-box} body{margin:0;background:var(--ink);color:var(--bone);font-family:ui-monospace,Menlo,monospace;display:flex;min-height:100vh}
  .panel{width:460px;padding:32px;border-right:1px solid #222;flex-shrink:0}
  .stage{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:32px;gap:20px;overflow:auto}
  h1{font-size:16px;letter-spacing:2px;color:var(--sage);margin:0 0 24px}
  label{display:block;font-size:11px;letter-spacing:1px;color:var(--gray);margin:18px 0 6px;text-transform:uppercase}
  input,select,textarea{width:100%;background:#141414;border:1px solid #2a2a2a;color:var(--bone);padding:10px 12px;font-family:inherit;font-size:14px;border-radius:6px}
  textarea{min-height:64px;resize:vertical}
  button{margin-top:24px;width:100%;background:var(--sage);color:var(--ink);border:0;padding:14px;font-weight:700;font-size:14px;border-radius:6px;cursor:pointer;letter-spacing:1px}
  img{max-width:480px;width:100%;border:1px solid #222;border-radius:10px}
  .cap{width:100%;max-width:480px;background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:13px;line-height:1.5;color:#ddd}
  .err{color:#C44A3A;font-size:13px;margin-top:12px}
  .hint{font-size:11px;color:var(--gray);margin-top:6px}
</style></head><body>
<form class="panel" method="POST" action="/render">
  <h1>◳ CVREI · NEWS POST STUDIO</h1>
  <label>Category</label><select name="category">${opts}</select>
  <label>Headline</label><textarea name="headline" placeholder="New direct flight links Cabo Verde and Brazil">${esc(item.headline || '')}</textarea>
  <label>Highlight (phrase coloured sage)</label><input name="highlight" value="${esc(item.highlight || '')}" placeholder="Cabo Verde and Brazil">
  <label>Date</label><input name="date" value="${esc(item.date || 'JUN 4, 2026')}">
  <label>Dek (one supporting line)</label><textarea name="dek" placeholder="First scheduled link between the two countries...">${esc(item.dek || '')}</textarea>
  <label><input type="checkbox" name="useAi" value="1" ${item.useAi ? 'checked' : ''} style="width:auto;margin-right:8px"> Generate AI image relevant to the headline</label>
  <div class="hint">${process.env.OPENAI_API_KEY ? 'AI: ENABLED' : 'AI: set OPENAI_API_KEY to enable. Without it, the default/URL image is used.'}</div>
  <label>Auto image prompt (derived from headline — edit to override)</label><textarea name="aiPrompt" placeholder="${esc(derived || 'Type a headline to auto-build the prompt...')}">${esc(item.aiPrompt || '')}</textarea>
  <label>…or image URL (used when AI is off)</label><input name="imageUrl" value="${esc(item.imageUrl || '')}" placeholder="https://...">
  <button>Generate post →</button>
  ${error ? `<div class="err">${esc(error)}</div>` : ''}
</form>
<div class="stage">
  ${imgData ? `<img src="data:image/png;base64,${imgData}"/>` : '<div class="hint" style="margin-top:80px">Fill the form and hit Generate.</div>'}
  ${caption ? `<div style="width:100%;max-width:480px"><label style="color:var(--gray)">Suggested caption</label><div class="cap">${esc(caption)}</div></div>` : ''}
  ${promptUsed ? `<div style="width:100%;max-width:480px"><label style="color:var(--gray)">Image prompt used</label><div class="cap" style="font-size:11px;color:#9a9a9a">${esc(promptUsed)}</div></div>` : ''}
</div>
</body></html>`;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(page());
  }
  if (req.method === 'POST' && req.url === '/render') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', async () => {
      const p = new URLSearchParams(body);
      const item = {
        category: p.get('category') || 'Market News',
        headline: p.get('headline') || 'Headline goes here',
        highlight: p.get('highlight') || '',
        date: p.get('date') || '',
        dek: p.get('dek') || '',
        imageUrl: p.get('imageUrl') || '',
        aiPrompt: p.get('aiPrompt') || '',
        useAi: p.get('useAi') === '1',
      };
      try {
        const imageBuffer = await getImageBuffer(item, item.useAi);
        const png = renderHero({ ...item, imageBuffer });
        const caption = suggestCaption(item);
        const promptUsed = item.useAi ? ((item.aiPrompt && item.aiPrompt.trim()) || buildImagePrompt(item)) : null;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(page({ item, imgData: png.toString('base64'), caption, promptUsed }));
      } catch (e) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(page({ item, error: e.message }));
      }
    });
    return;
  }
  res.writeHead(404); res.end('not found');
});

server.listen(PORT, () => console.log(`CVREI News Post Studio → http://localhost:${PORT}`));
