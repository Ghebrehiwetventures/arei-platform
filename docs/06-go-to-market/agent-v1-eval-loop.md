# Agent V1 Eval Loop

## Purpose

Agent V1 should now move from eyeballed top-10 tuning to measured tuning.

This eval loop is intentionally small:

- one checked-in eval set
- one manual label schema
- one tiny runner script
- no UI
- no DB changes
- no benchmark service

## Eval Set

File:

- `arei-admin/evals/agent_v1_eval_set.cv.json`

The seed set should stay around `30` to `50` listings.

Each row includes:

- `listing_id`
- `source_url`
- `title_snapshot`
- `location_snapshot`
- `price_snapshot`
- `label`
- optional `preferred_theme`
- optional `acceptable_angles`
- optional `red_flags`
- optional `notes`

## Label Meanings

- `strong_candidate`
  - Should usually be welcome in the top 10.
- `maybe`
  - Acceptable if selected, but not important to force high.
- `weak`
  - Should rarely appear in the top 10.
- `reject`
  - Should not appear in the top 10.

## Optional Labels

- `preferred_theme`
  - One of `dream`, `trust`, `opportunity`
- `acceptable_angles`
  - Small angle-family set:
    - `lifestyle`
    - `trust`
    - `opportunity`
    - `value`
- `red_flags`
  - Human reasons to watch, for example:
    - `severe_fact_conflict`
    - `studio-vs-beds`
    - `title_artifact`
    - `feed-code-title`
    - `land-only`
    - `project-family-duplicate`

## Runner

Script:

- `scripts/eval_agent_v1_selector.ts`

Run:

```bash
npx tsx scripts/eval_agent_v1_selector.ts
```

Optional custom path:

```bash
npx tsx scripts/eval_agent_v1_selector.ts arei-admin/evals/agent_v1_eval_set.cv.json
```

The script:

- loads the eval set
- loads current live rows for those listing IDs
- computes source quality from the live Cape Verde universe
- runs the current selector
- prints metrics
- prints top-10 selections
- prints mismatches and obvious failures

## PR-Readiness Thresholds

These are launch-safe sanity thresholds for Agent V1, not a full benchmark standard.

- `top_k_precision >= 0.50`
- `top_k_accept_rate >= 0.80`
- `reject_leakage = 0`
- `weak_leakage <= 1`
- `theme_agreement >= 0.70`
- `angle_usefulness >= 0.80`
- `diversity_sanity`
  - `max_per_source <= 4`
  - `max_per_island <= 7`
  - `max_per_family <= 2`

If `reject_leakage` is non-zero, fix that before more broad tuning.

## How To Update The Eval Set

1. Keep the set small and reviewable.
2. Prefer real disagreements over easy examples.
3. Keep a mix of:
   - obvious wins
   - plausible maybes
   - weak but tempting listings
   - clear rejects
4. When the selector fails, first ask whether:
   - the heuristic is wrong
   - the label is wrong
   - the eval set is too narrow
5. Avoid stuffing the eval set with near-duplicates from one resort cluster unless the point is to test diversity.

## Operating Rule

After this eval loop exists, further selector tuning should mostly happen in response to labeled eval failures, not another round of informal top-10 polishing.
