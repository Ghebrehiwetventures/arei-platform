# Guide Social Builder real-use notes

Date: 2026-06-18
Branch: `codex/guide-social-builder-v1`
Scope: draft PR #400 only. No listing, news, campaign, tracking or publishing integration was tested or added.

## Test posts created

ZIP exports were created locally in `/tmp/guide-social-builder-real-posts/`:

1. `7-things-to-know-about-cape-verde.zip`
2. `cape-verde-on-the-world-stage.zip`
3. `the-colors-of-cape-verde.zip`

Each export included numbered 4:5 PNGs, `caption.txt` and `metadata.json`. The content slides rendered at 1080 x 1350 and used real Wikimedia Commons Cape Verde photography with manually entered credits and Creative Commons/GFDL-style source status.

World Cup claim checked against:

- FIFA: https://www.fifa.com/en/articles/cabo-verde-qualification-reaction
- The Guardian: https://www.theguardian.com/football/2025/oct/14/cape-verde-celebrate-historic-2026-world-cup-qualification

## What takes too long

- Setting image rights one slide at a time is repetitive when several uploaded photos share the same rights/source status.
- Creating a post from scratch is still slow when the editorial facts are not already collected beside the image and slide copy.
- The World Cup/moment post took longer than the other two because the tool accepts the editorial angle, but the publish-ready work is finding rights-clear moment-specific photography and confirming the exact claim sources.

## Repeated manual work

- Confirming or normalizing photo credits across every slide, even when credits repeat.
- Selecting the same rights/source value for each slide.
- Re-entering common source context in the internal note/caption when a factual post needs source confidence beyond photo credits.

## What is confusing

- After toggling Brand filter, the visible preview does not change until Render preview is clicked again.
- Uploaded images display as "Uploaded image" in the URL field, so the original filename is only visible lower down near the credit field.
- The builder has photo credits, but no explicit place for editorial/fact sources; internal note can hold them, but that is not obvious during publishing review.

## What is missing to publish comfortably

- A clear internal place to keep factual source links for the post or slide set. This matters most for educational and news-adjacent posts, including the World Cup/moment post.
- Rights-clear, moment-specific photography. The current upload workflow works, but the operator still needs to source the right photos outside the tool.
- A quick way to apply the same rights/source value across multiple selected slides would reduce repetitive form work without changing the manual-first model.

## Smallest next improvement

Do not expand the builder yet.

If one small improvement is added after this test, make it a source-confidence aid rather than a new content feature: add a compact, non-rendered source notes field that is included in `metadata.json` only. It can start as a simple textarea near Post details and be used for guide URLs, fact-check links or publication notes.

The second-smallest improvement would be a bulk "apply rights/source to all slides still unknown" action, but source notes are more important for publishing educational posts comfortably.
