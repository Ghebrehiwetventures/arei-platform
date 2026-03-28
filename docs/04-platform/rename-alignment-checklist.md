# Rename Alignment Checklist

Status: Draft
Execution state: Not started
Last updated: 2026-03-21

## Governing Reference

This checklist is governed by `docs/06-go-to-market/brand-architecture.md`.

All naming work must remain consistent with these rules:
- `AREI` is the parent platform.
- `AREI Admin` is the internal operational product.
- `KazaVerde` is the Cape Verde consumer surface.
- `Powered by AREI` is the default endorsement language.
- Canonical naming, technical identifiers, and public branding are separate layers.

If any planned rename conflicts with `docs/06-go-to-market/brand-architecture.md`, the brand architecture document wins.

## Freeze Rule

No GitHub repo rename, Vercel project rename, package rename, domain rename, or deployment-identifier rename may happen until the docs-alignment steps in Track 2 are complete and validated.

Allowed during freeze:
- read-only audits
- documentation alignment
- rename impact analysis

Not allowed during freeze:
- GitHub repo rename
- Vercel project rename
- package rename
- domain change
- deployment-label change treated as canonical

## Roles

- `Product / Platform Lead`: approves freeze release and final naming decisions.
- `Docs Owner`: owns canonical docs and deployment-doc alignment.
- `Repo Admin`: owns GitHub settings and repo metadata.
- `Vercel Admin`: owns Vercel settings, project naming, and domain mapping.
- `Platform Engineer`: owns in-repo technical rename preparation and execution.
- `Release Owner`: owns post-change verification.

## Track 1: Manual UI Checklist

### 1. GitHub Audit

Owner: `Repo Admin`

[ ] Open the GitHub repository settings in read-only mode.
[ ] Record the current repo name, description, homepage, default branch, and connected integrations.
[ ] Record the current local `origin` remote and confirm it matches the GitHub repo identity.
[ ] Do not rename the repo during this step.

Validation:
- Current GitHub identity is captured before any rename planning continues.
- GitHub repo naming matches the current local remote configuration.
- No settings drift is introduced.

Evidence examples:
- Screenshot of the GitHub repository settings page showing the current repo name.
- Screenshot of the default branch settings showing `main`.
- Screenshot of the repo description and homepage fields.
- Copy of the current `origin` URL from local git config.

Rollback:
- None. This is a read-only audit.

### 2. Vercel Project Audit

Owner: `Vercel Admin`

[ ] Open the `kazaverde-web` Vercel project in read-only mode.
[ ] Record project name, root directory, build command, output directory, connected repo, production branch, and attached domains.
[ ] Open the `arei-admin` Vercel project in read-only mode.
[ ] Record project name, root directory, build command, output directory, connected repo, production branch, and attached domains.
[ ] Do not rename either Vercel project during this step.

Validation:
- `kazaverde-web` is confirmed as the KazaVerde deployment project.
- `arei-admin` is confirmed as the admin deployment project.
- Current Vercel settings match in-repo deployment config and deployment docs.

Evidence examples:
- Screenshot of `kazaverde-web` General settings.
- Screenshot of `arei-admin` General settings.
- Screenshot of Git settings for each Vercel project.
- Screenshot of the Domains tab for each Vercel project.

Rollback:
- None. This is a read-only audit.

### 3. Domain Mapping Audit

Owner: `Vercel Admin`

[ ] Confirm that `kazaverde.com` is attached only to the KazaVerde production project.
[ ] Confirm that no admin or internal surface is being treated as a consumer-facing brand domain.
[ ] Confirm that current domain assumptions match deployment docs.
[ ] Do not add, remove, or reassign any domain during this step.

Validation:
- `kazaverde.com` maps only to KazaVerde.
- Domain mapping does not blur the boundary between consumer and admin surfaces.
- Production assumptions match deployment documentation.

Evidence examples:
- Screenshot of the `kazaverde-web` Domains tab showing `kazaverde.com`.
- Screenshot confirming no consumer-facing domain is attached to `arei-admin`.
- Copy of the relevant deployment-doc lines that define the production domain.

Rollback:
- None. This is a read-only audit.

### 4. Freeze Gate Confirmation

Owner: `Product / Platform Lead`

[ ] Confirm that Track 2 steps 1 through 4 are complete.
[ ] Confirm that the docs define the canonical mapping between canonical names, technical identifiers, and public branding.
[ ] Confirm that no GitHub, Vercel, package, or domain rename has happened yet.
[ ] Approve or deny freeze release explicitly.

Validation:
- Freeze is not lifted until docs alignment is complete and reviewed.
- Naming work remains governed by documentation, not platform UI defaults.

Evidence examples:
- Approval comment in the tracking issue or PR.
- Checklist state showing Track 2 steps 1 through 4 complete.
- Link to the approved `docs/06-go-to-market/brand-architecture.md` and aligned deployment docs.

Rollback:
- If freeze was lifted early, re-enter freeze immediately and stop all rename work.

### 5. GitHub Metadata Update

Owner: `Repo Admin`

[ ] Update GitHub repo description and homepage only if needed to match the canonical architecture.
[ ] Keep the repo name unchanged during this step.
[ ] Ensure repo metadata describes the repo as platform infrastructure that powers KazaVerde.
[ ] Do not change git remote URLs during this step.

Validation:
- GitHub metadata reflects the approved architecture.
- No repo identity change occurs.
- Vercel integrations remain unaffected.

Evidence examples:
- Before/after screenshot of the GitHub repo description.
- Screenshot of the repo homepage field.
- Confirmation that the repo URL and slug are unchanged.

Rollback:
- Restore the previous description and homepage values.

### 6. Optional GitHub Repo Rename

Owner: `Repo Admin`

[ ] Rename the GitHub repo only if explicitly approved after docs alignment.
[ ] Update local remote references only after the GitHub rename is complete.
[ ] Do not rename Vercel projects during this step.
[ ] Record the old and new repo names in the rename inventory and deployment docs.

Validation:
- The old GitHub URL redirects correctly.
- The new repo name matches the approved technical naming decision.
- Local remotes update cleanly.
- Vercel Git connections remain intact.

Evidence examples:
- Screenshot of the renamed GitHub repo header.
- Browser check that the old repo URL redirects to the new repo URL.
- Screenshot of Vercel Git settings showing the renamed repo still connected.
- Updated local `git remote -v` output.

Rollback:
- Rename the repo back to the previous name.
- Restore the previous local remote URL.
- Re-check Vercel Git linkage immediately.

### 7. Vercel Git Reverification

Owner: `Vercel Admin`

[ ] Open both Vercel projects immediately after any GitHub repo rename.
[ ] Confirm connected repo, production branch, root directory, build command, and output directory for both projects.
[ ] Confirm that no settings drift was introduced by the GitHub rename.
[ ] Do not rename Vercel projects during this step.

Validation:
- Both Vercel projects still point to the correct repo and branch.
- KazaVerde and admin build settings remain unchanged.
- GitHub rename did not break deployment wiring.

Evidence examples:
- Screenshot of `kazaverde-web` Git settings after repo rename.
- Screenshot of `arei-admin` Git settings after repo rename.
- Screenshot of recent deployment history showing healthy builds.

Rollback:
- Reconnect the Vercel projects to the previous repo path if needed.
- If the connection cannot be restored cleanly, revert the GitHub repo rename.

### 8. Optional Vercel Project Rename

Owner: `Vercel Admin`

[ ] Rename a Vercel project only if explicitly approved after GitHub rename stability is confirmed.
[ ] Rename only one Vercel project at a time.
[ ] Reconfirm root directory, build command, output directory, domains, and environment bindings immediately after the rename.
[ ] Keep the public brand unchanged during this step.

Validation:
- The Vercel project rename affects only a technical identifier.
- Production domain attachment remains correct.
- Preview and production behavior still match the intended surface.

Evidence examples:
- Screenshot of the renamed Vercel project settings page.
- Screenshot of the Domains tab showing the expected production domain still attached.
- Screenshot of the deployment summary after the rename.

Rollback:
- Rename the Vercel project back to the previous name.
- Reattach the domain if needed.
- Trigger a fresh deploy from the last known-good commit.

### 9. Post-Change Production Verification

Owner: `Release Owner`

[ ] Verify `kazaverde.com` on production after every GitHub rename or Vercel rename event.
[ ] Verify that admin still resolves to the correct protected operational surface.
[ ] Verify that no internal identifier is exposed as the public product name.
[ ] Record verification results in the deployment log or release note.

Validation:
- KazaVerde still resolves correctly on `kazaverde.com`.
- Admin is still separate from the consumer surface.
- Public naming remains `KazaVerde`, with secondary endorsement only where intended.

Evidence examples:
- Screenshot of `kazaverde.com` home page after the rename event.
- Screenshot of the admin login or admin shell.
- Screenshot of page footer or about area showing `Powered by AREI` where applicable.
- Link to the successful production deployment.

Rollback:
- Restore the previous GitHub or Vercel name if the rename caused routing or identity confusion.
- Reassign the domain if needed.
- Redeploy the last known-good build.

## Track 2: In-Repo Checklist

### 1. Save Canonical Brand Architecture

Owner: `Docs Owner`

[ ] Save the approved `brand-architecture.md` in the canonical docs location.
[ ] Ensure the document explicitly defines canonical naming, technical identifiers, public branding, and default endorsement language.
[ ] Ensure the document is marked as normative.
[ ] Do not change any package, repo, or deployment identifiers during this step.

Validation:
- A single canonical document exists and is approved.
- The document clearly separates the three naming layers.
- `Powered by AREI` is defined as the default endorsement language.

Evidence examples:
- PR diff showing the new `brand-architecture.md`.
- Screenshot of the file in the docs tree.
- Review approval or sign-off comment from the `Product / Platform Lead`.

Rollback:
- Revert the doc-only commit if the wording is not approved.

### 2. Align Deployment Docs to the Canonical Model

Owner: `Docs Owner`

[ ] Update KazaVerde deployment docs to distinguish canonical name, technical identifier, Vercel project, and public brand.
[ ] Update admin deployment docs to distinguish canonical product name from technical deployment name.
[ ] Update platform handoff and security docs to use the same three-layer naming logic.
[ ] Add `Powered by AREI` as the default endorsement language where endorsement policy is described.

Validation:
- Every major deployment doc reflects the same naming model.
- No deployment doc treats repo or Vercel names as the public brand.
- KazaVerde docs describe `kazaverde-web` as technical and `KazaVerde` as public.
- Admin docs describe `arei-admin` as technical and `AREI Admin` as canonical.

Evidence examples:
- PR diff for `docs/kazaverde_deploy_contract.md`.
- PR diff for `arei-admin/DEPLOY.md`.
- PR diff for `docs/04-platform/vercel-deploy.md`.
- PR diff for `docs/04-platform/tooling-handoff.md`.
- PR diff for `docs/04-platform/security-baseline.md`.

Rollback:
- Revert the doc-only commit set.

### 3. Align Internal Component Framing

Owner: `Docs Owner`

[ ] Review docs and package descriptions that mention `AREI SDK`.
[ ] Ensure `AREI SDK` is always framed as an internal technical component, never as a public-facing brand.
[ ] Ensure `arei-admin` remains framed as an internal operational product identifier.
[ ] Ensure `kazaverde-web` remains framed as a technical deployment identifier, not a public brand.

Validation:
- `AREI SDK` is never described as a consumer-facing product.
- Internal technical components are not promoted into public brand language.
- Docs consistently distinguish internal package names from public naming.

Evidence examples:
- PR diff for `packages/arei-sdk/package.json` description if wording needs alignment.
- PR diff for docs that mention `AREI SDK`.
- Search results showing `AREI SDK` appears only in technical contexts.

Rollback:
- Revert the terminology patch set if any wording introduces ambiguity.

### 4. Build Rename Impact Inventory

Owner: `Platform Engineer`

[ ] Create a rename impact inventory covering GitHub repo references, package names, Vercel project names, deployment docs, scripts, and hard-coded identifiers.
[ ] Record what will change, what will stay unchanged, and what remains public-facing versus internal.
[ ] Record all current references that would need follow-up if the GitHub repo is renamed.
[ ] Record all current references that would need follow-up if package names are renamed.

Validation:
- No rename is approved without a complete impact inventory.
- The inventory covers GitHub, Vercel, repo/package naming, and deployment docs.
- The inventory clearly protects public naming from technical naming drift.

Evidence examples:
- A markdown inventory file or issue comment listing all current identifiers.
- Search results for `arei-platform`.
- Search results for `arei-platform`.
- Search results for `arei-admin`.
- Search results for `kazaverde-web`.
- Search results for `kazaverde.com`.

Rollback:
- None. This is an analysis artifact.

### 5. Freeze Release Gate

Owner: `Product / Platform Lead`

[ ] Review Track 2 steps 1 through 4.
[ ] Confirm docs alignment is complete.
[ ] Confirm the rename inventory is complete enough to support safe execution.
[ ] Approve or deny progression into rename execution.

Validation:
- Freeze is lifted only when canonical docs and deployment docs are aligned.
- Rename work remains sequenced and controlled.
- The project can distinguish technical rename work from public brand identity.

Evidence examples:
- Approval comment in the checklist issue or PR.
- Links to the aligned docs.
- Link to the rename impact inventory.

Rollback:
- If new drift is found, keep the freeze in place and reopen docs alignment.

### 6. Prepare Rename Patch Set

Owner: `Platform Engineer`

[ ] Prepare the planned in-repo rename changes only after the freeze is lifted.
[ ] Separate the patch set into clearly scoped units such as docs, package metadata, scripts, and config references.
[ ] Keep `AREI Admin` stable unless an explicit rename decision is approved.
[ ] Keep `AREI SDK` clearly internal-only in all patch descriptions.

Validation:
- Planned changes are explicit, reviewable, and reversible.
- The patch set does not mix unrelated technical and public-brand changes.
- The patch set preserves the approved architecture.

Evidence examples:
- Draft PR or patch summary listing affected files.
- Change plan showing which identifiers change and which stay the same.
- Review note confirming no public brand is being renamed accidentally.

Rollback:
- Discard the patch set if sequencing, naming, or scope is not approved.

### 7. Apply In-Repo Rename Changes

Owner: `Platform Engineer`

[ ] Apply in-repo rename changes only after UI-side sequencing is complete and stable.
[ ] Update package metadata, scripts, docs, and config references according to the approved change set.
[ ] Do not introduce public-brand wording that conflicts with the canonical model.
[ ] Rebuild or reinstall dependencies if package metadata changes require it.

Validation:
- Repo and package identifiers are internally consistent.
- Deployment docs match the implemented technical identifiers.
- Public-facing naming remains unchanged unless explicitly intended.
- `AREI SDK` remains an internal technical component.

Evidence examples:
- PR diff for `package.json` and any renamed package references.
- Build output showing successful install or build after metadata changes.
- Search results showing the expected identifier replacements.

Rollback:
- Revert the rename commit set.
- Restore the previous package metadata.
- Reinstall dependencies if needed.

### 8. Repo-Wide Drift Check

Owner: `Platform Engineer`

[ ] Run a repo-wide naming drift check after every rename step.
[ ] Confirm that current references match the intended state for platform, admin, consumer surface, and endorsement language.
[ ] Confirm that no deployment doc or package file reintroduces the old naming model.
[ ] Record the drift-check result before closing the step.

Validation:
- Search results match the approved naming state.
- No contradictory naming remains in active docs, package metadata, or deploy config.
- `Powered by AREI` is the default endorsement language where endorsement is referenced.

Evidence examples:
- Search results for `arei-platform`.
- Search results for `arei-platform`.
- Search results for `arei-admin`.
- Search results for `kazaverde-web`.
- Search results for `Powered by AREI`.
- A short verification note summarizing any intentional remaining technical identifiers.

Rollback:
- Revert the last change set that introduced drift.
- Re-run the drift check after the rollback.

## Completion Criteria

This checklist is complete only when:
- the canonical brand architecture document is saved and approved
- deployment docs are aligned to the three-layer model
- the freeze rule has been followed
- any approved GitHub or Vercel renames have been validated
- any approved in-repo renames have been validated
- the repo-wide drift check shows the intended naming state
- public branding still presents `KazaVerde` as the Cape Verde surface with `Powered by AREI` as the default endorsement

## Out of Scope

This checklist does not authorize:
- code or UI copy changes unrelated to naming alignment
- domain strategy changes beyond verification and mapping checks
- product-model changes such as introducing marketplace or transaction language
- public rebrand launches beyond the approved architecture
