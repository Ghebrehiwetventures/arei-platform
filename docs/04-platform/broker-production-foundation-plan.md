# AREI Broker Production Foundation Plan

**Status:** Draft implementation plan
**Date:** 2026-05-15
**Source of truth:** `research/broker-tool-product-research-2026-05.md`
**Target app:** `arei-broker`

This plan translates the broker product research into a production foundation for `arei-broker`. It is intentionally a plan only: no SQL, no code, and no schema changes are included here.

The product position is fixed by the research: the real competitor is **Google Sheets + WhatsApp + Facebook**, not enterprise CRM software. V0 should be a mobile-responsive web app that gives small and mid-sized agencies a daily workflow for listings, leads, WhatsApp sharing, team access, and a public agency page.

---

## 1. Current State

### What exists now

`arei-broker` exists as a separate Vite/React web app with broker-facing screens for:

- Today/action hub
- Leads inbox
- Listings manager
- Listing detail and edit form
- Public agency page preview
- Agency profile/settings
- Notifications
- Basic share flows using public links and `wa.me`

The current data layer uses Supabase and has broker-safe column selectors for agencies, listings, and leads. Existing pilot data structures include:

- `agencies`
- `broker_pilot_listings`
- `leads`
- `broker.market_listings_view` for public market access

The current prototype also has useful UX patterns:

- Listing quality hints
- Listing draft / review / published status language
- Lead status pipeline
- WhatsApp reply links
- Public agency page preview
- Mobile-first layout direction

### Why the current demo is not production-ready

The current demo is useful for broker meetings, but it is not safe for real agency onboarding.

The main blockers are:

- The broker app currently relies on anonymous Supabase access patterns.
- Agencies are selected through a demo agency switcher rather than derived from an authenticated user's membership.
- RLS currently permits broad anonymous read/update in the pilot tables.
- Tenant isolation is enforced by frontend filters, not by a production auth and membership model.
- There is no production-grade `agency_users`, membership, invite, or role model.
- Some high-value UI surfaces are mock/demo content, especially Today/Pulse, notifications, and viewing-style activity.
- Admin controls are not yet organized around production support, review, suspension, reset access, and audit workflows.
- Broker-owned lead data is not yet protected by a complete permission model.

### Reusable parts

The current work is still valuable. Reuse:

- The separate `arei-broker` app boundary.
- Broker-safe field selection discipline.
- The listing form and quality hint concept.
- The lead inbox interaction model.
- The public agency page concept.
- The `wa.me` link approach.
- The separation between "My Agency" data and read-only Market Access.
- The principle that AREI Admin approves/rejects listings before they reach the public market index.

Do not reuse as production foundations:

- Demo agency switcher.
- Anonymous client CRUD for private broker data.
- `using (true)` pilot RLS policies.
- Mock Pulse/notification/viewing data without hard production labeling.
- Any admin-only field exposure pattern in broker-facing reads.

---

## 2. Target V0 Architecture

### Auth

V0 auth should support:

- Google login.
- Email magic link.
- WhatsApp number as a required contact field, not a login method.

Do not build V0 auth around SMS OTP or WhatsApp OTP. Email magic link must be first-class because Google account penetration is uneven across target markets.

Auth sessions should be the basis for all private broker reads and writes. `arei-broker` should stop using an anonymous data client for agency-owned data.

### Agency Tenant

The agency account is the tenant. Every private broker-owned record should belong to exactly one agency.

The tenant boundary should be enforced by:

- Membership lookup from the authenticated user.
- `agency_id` ownership on agency-owned records.
- RLS policies that check membership and role.
- UI context loaded from membership, not from a selectable demo agency list.

### Agency Users

An agency user represents a human account that can authenticate into `arei-broker`. A user should have stable identity fields such as email, name, phone/WhatsApp, auth provider identity, and last login.

V0 should lock normal users to one agency unless there is a clear support need for multi-agency membership. The data model can allow many-to-many later through memberships.

### Memberships

Memberships connect users to agencies and define their role. The membership row is the core authorization object for the broker app.

Memberships should hold:

- Agency reference.
- User reference.
- Role.
- Active/removed state.
- Per-agent controls such as `can_publish_directly`.
- Optional visibility settings where needed, while keeping V0 simple.

### Invitations

Team onboarding should happen through invitations:

- Owner can invite Manager, Agent, Viewer.
- Manager can invite Agent and Viewer only.
- Invitations should expire.
- Invitations should resolve into memberships when accepted.
- Resend/revoke flows should exist in admin and owner/manager UI.

### Roles

V0 role model:

- Owner
- Manager
- Agent
- Viewer

Owner is single per agency. Manager is functional admin without billing or ownership transfer. Agent works their own listings and leads by default. Viewer is read-only.

Avoid custom roles and per-permission builders in V0.

### Listings

Listings should move from pilot-specific semantics into production agency inventory:

- Owned by an agency.
- Assigned to or created by an agency user.
- Editable based on role and ownership.
- Statuses for daily workflow: draft, active, reserved, sold, withdrawn.
- Public market publication requires AREI review/approval.
- Brokers can submit listings for review but cannot directly publish into the AREI market index unless policy later allows a trusted path.

### Leads

Leads belong to an agency and may be tied to a listing. V0 must support:

- Web form capture from public agency/listing pages.
- Manual entry.
- `wa.me` link context from listing shares.
- Assigned agent.
- Status pipeline.
- Notes timeline.
- Follow-up date or next action date.

Lead contact details are broker-owned data. They should not be indexed, aggregated, or exposed in AREI public data products.

### Public Agency Page

Each agency should get a public page on an AREI-controlled subdomain/path in V0. It should show:

- Agency display name.
- Logo.
- Bio.
- WhatsApp contact.
- Email and phone where provided.
- Active public listings.
- Listing detail/share links.

Custom domains are premium/later. The public agency page should be part of the core free V0 because it is the onboarding "wow" moment.

### Admin Controls

AREI Admin must be able to:

- Create, edit, verify, and suspend agencies.
- Invite, remove, and reset access for agency users.
- Approve or reject listings before public market index publication.
- View audit logs.
- Toggle premium features later.

Dangerous operations, especially suspension, force removal, force publish/unpublish, and impersonation, must be explicit and logged.

---

## 3. Data Model Plan

This section proposes table ownership and relationships only. It is not SQL.

### `agencies`

The tenant table. One row per agency.

Owns:

- Public identity: name, slug, display name, logo, bio.
- Contact fields: WhatsApp required for activation, email and phone optional/secondary.
- Market/country metadata.
- Verification state.
- Suspension state.
- Agency-level settings such as whether agents can see all leads.
- Billing/premium summary fields only if needed for fast reads.

All private agency records reference `agencies.id`.

### `agency_users`

Human user identity table.

Owns:

- Auth user ID.
- Email.
- Name.
- Phone/WhatsApp.
- Last login.
- Account status.

A user can theoretically belong to multiple agencies through memberships, but V0 should treat one agency as the normal case.

### `agency_memberships`

Join table between `agency_users` and `agencies`.

Owns:

- Role: owner, manager, agent, viewer.
- Membership status.
- Per-agent flags such as `can_publish_directly`.
- Optional assignment/display metadata.

This is the main authorization table for `arei-broker`.

### `agency_invitations`

Pending invitation table.

Owns:

- Agency.
- Email.
- Intended role.
- Invited by user/admin.
- Token or invite identifier.
- Expiry.
- Accepted/revoked timestamps.

Accepted invitations create or attach an `agency_user`, then create an `agency_membership`.

### `agency_listings`

Production agency inventory table.

Owns:

- Agency ID.
- Created by user.
- Assigned/owning agent.
- Listing fields: title, price, currency, property type, location, bedrooms, bathrooms, size, description.
- Photos/media references.
- Internal agency status: draft, active, reserved, sold, withdrawn.
- Public review/publication status: submitted, approved, rejected, unpublished.
- Soft delete fields.

This table powers the agency workspace and, once approved, can feed the public agency page and market projection.

### `leads`

Agency-owned lead table.

Owns:

- Agency ID.
- Optional listing ID.
- Assigned agent.
- Buyer name and contact details.
- Source: web form, `wa.me`, manual, email/Facebook later.
- Status: new, contacted, viewing, offer/negotiating, closed, lost.
- Follow-up/next action date.

Every lead belongs to exactly one agency.

### `lead_notes`

Append-only lead timeline.

Owns:

- Lead ID.
- Agency ID for RLS convenience.
- Author user.
- Note body.
- Note type if needed later.
- Created timestamp.

Notes should not be edited silently. If edits are allowed later, keep revision/audit behavior.

### `agency_page_settings`

Public-page configuration separate from `agencies`.

Owns:

- Agency ID.
- Public bio overrides.
- Contact display choices.
- Theme/banner settings.
- Public page activation state.
- SEO/social metadata if needed.

Keep this separate so public page presentation changes do not pollute the core tenant record.

### `audit_logs`

Immutable audit events.

Owns:

- Actor type: agency user, AREI admin, system.
- Actor ID.
- Agency ID where relevant.
- Target object and target ID.
- Action.
- Before/after summary where appropriate.
- IP/session metadata where appropriate.
- `impersonated_by` and ticket/reference when applicable.

Log all editorial, dangerous, and high-signal agency actions.

### `admin_review_queue`

Structured review queue for AREI Admin.

Owns:

- Review subject type: agency, listing, verification, publication.
- Subject ID.
- Agency ID.
- Status.
- Submitted by.
- Assigned admin.
- Decision, reason, and timestamps.

This table should coordinate admin work; it should not become broker-visible internal commentary.

### `premium_features`

Feature flag table indexed by agency.

Owns:

- Agency ID.
- Feature key.
- Enabled state.
- Source: trial, manual override, billing.
- Start/end timestamps where relevant.

Use for custom domain, branded packs, advanced WhatsApp, extra seats, and other later paid features.

---

## 4. RLS and Permission Model

### Core Rule

Private broker data is visible only when:

1. The request is authenticated.
2. The user has an active membership in the relevant agency.
3. The role allows the action.
4. The row belongs to the membership's `agency_id`.

Frontend filtering is never the security boundary.

### Owner

Can read and write all private agency data.

Can:

- Manage agency profile and page settings.
- Invite any role except another Owner unless transferring ownership.
- Remove Manager, Agent, Viewer.
- Transfer ownership through a specific flow.
- Create/edit any listing.
- Submit listings for review.
- Assign leads.
- Read and update all leads and notes.
- View agency audit log.
- Change billing/premium settings when billing exists.

Cannot:

- Access another agency's private data.
- Approve listings into the AREI market index unless acting through AREI Admin role.

### Manager

Can run agency operations, excluding ownership and billing.

Can:

- Manage agency profile and page settings.
- Invite/remove Agents and Viewers.
- Create/edit any agency listing.
- Submit listings for review.
- Assign leads.
- Read and update all agency leads and notes.
- View agency audit log.

Cannot:

- Change billing.
- Transfer ownership.
- Invite/remove Owner.
- Access another agency's private data.

### Agent

Can work their assigned inventory and leads.

Can:

- Create own listings.
- Edit own listings.
- Submit own listings for review.
- Mark own listings reserved/sold/withdrawn.
- Read all agency listings, unless product later narrows this.
- Read assigned leads.
- Add notes and update status on assigned leads.
- Read all leads only if the agency-level "agents see all leads" setting is enabled.

Cannot:

- Manage agency profile/page settings.
- Invite users.
- Assign leads unless explicitly promoted later.
- Edit another agent's listing by default.
- Publish directly into the public market index unless a later policy explicitly allows it.

### Viewer

Read-only role.

Can:

- Read agency listings.
- Read agency leads according to the agency's Viewer policy.
- Read public/market data.

Cannot:

- Create, edit, assign, submit, delete, invite, or change settings.

### AREI Admin

AREI Admin is separate from broker roles.

Can, through `arei-admin`:

- View and manage agencies.
- Verify/suspend agencies.
- Invite/remove/reset agency users.
- Approve/reject listings for public market index publication.
- View admin review queue.
- View audit logs.
- Toggle premium features later.

Admin actions should be structured and logged. Production support should not rely on raw database edits.

Impersonation, if ever added, must be feature-flagged, require a ticket/reference, and write all actions with `impersonated_by`.

### Public Data

Publicly readable:

- Public agency pages.
- Public listing detail pages.
- Approved/published market listings.
- Broker-safe market listing projection.

Never public:

- Draft listings.
- Rejected listings unless agency chooses to show them privately.
- Lead contact data.
- Lead notes.
- Internal agency notes.
- Admin review notes.
- Audit logs.
- Suspension reason details.

### Market Access

Market Access remains a read-only path against the public market listing projection.

Rules:

- It reads approved, published market listing data.
- It does not read private agency inventory tables directly.
- It does not expose leads, lead counts, private notes, quality scores, admin review data, or demand signals for other agencies.
- It can be publicly readable in the same way the consumer market index is publicly readable.

### Broker Isolation by `agency_id`

All private broker tables should carry `agency_id` directly or through a parent row that can be safely checked in RLS.

Recommended practical rule:

- Put `agency_id` directly on high-traffic child tables such as leads, lead notes, listings, page settings, and audit logs.
- RLS should validate active membership for that `agency_id`.
- Cross-agency reads should only happen through public projections or admin-only policies.

---

## 5. App Architecture Changes

### Remove Demo Agency Switcher

`arei-broker` should no longer load all agencies and let the user select one.

Production behavior:

- User signs in.
- App loads the user's active membership.
- App derives agency context from that membership.
- If the user has no agency, route to create agency onboarding.
- If the user has multiple memberships later, route to an explicit agency picker after auth.

### Replace Anonymous Client Patterns

Private app reads/writes should use the authenticated session.

The anonymous/public client can remain only for:

- Public agency pages.
- Public listing pages.
- Market Access if it reads the public market projection.

Broker-owned listings, leads, notes, page settings, and membership reads should require auth.

### Load Agency Context From Membership

The app shell should load:

- Current user.
- Current agency user record.
- Active membership.
- Agency profile.
- Role and capability flags.

UI should render from capabilities, not from hard-coded role names wherever possible.

### Hide or Label Demo/Mock Features

Mock content should not appear as real production activity.

Before onboarding real brokers:

- Remove mock Pulse items or label the module clearly as preview/coming soon.
- Remove mock viewing data or move viewings to V1.
- Replace mock notifications with real events or hide notification center.
- Avoid "AI briefing" language unless backed by real logic.

### Role-Based UI Capabilities

The UI should reflect permissions:

- Owner sees agency settings, team management, billing/premium placeholders, all listings/leads.
- Manager sees agency settings, team management for Agents/Viewers, all listings/leads, no billing.
- Agent sees own operational workflow: listings, assigned leads, share actions.
- Viewer sees read-only lists/details and no mutation controls.

Server/RLS remains authoritative. UI gating is for clarity, not security.

---

## 6. Admin Architecture Changes

`arei-admin` needs a production agency administration area separate from the current pilot/demo surfaces.

### Agency Admin Panel

Required capabilities:

- Search agencies.
- View agency profile.
- View verification/suspension state.
- View team members.
- View recent activity.
- Edit broker-safe agency fields.
- Add internal admin notes without exposing them to brokers.

### User Invites

Admin should be able to:

- Invite a user to an agency.
- Resend invite.
- Revoke pending invite.
- See invitation status and expiry.

### Role Management

Admin should be able to:

- Change role within allowed constraints.
- Transfer ownership through a deliberate flow.
- Prevent agencies from having zero Owners.
- Prevent accidental Owner creation by non-owner managers.

### Reset Access

Support actions:

- Reset or resend email magic link.
- Force logout/revoke sessions where supported.
- Update login email only through a logged admin action.

### Suspend Agency

Suspension should:

- Make agency users read-only or block access depending on reason.
- Remove/hide public agency page.
- Prevent new lead capture.
- Prevent listing submission.
- Log the action.

Use soft suspension states rather than destructive deletion.

### Listing Review Queue

Admin should have a queue for:

- Listings submitted for public market approval.
- Agency verification tasks.
- Rejections with structured reason.
- Approval history.

Brokers should see status and broker-safe feedback, not internal review notes.

### Audit Log

Admin must be able to filter audit events by:

- Agency.
- Admin user.
- Agency user.
- Action.
- Target object.
- Date range.

Editorial and dangerous actions must be logged from day one.

### Premium Feature Toggles Later

Add a simple feature toggle panel when premium features exist.

Do not build billing or custom domain management before the core broker loop works.

---

## 7. Onboarding Flow

Use the research sequence. The goal is to get a broker to the value moment quickly.

### Step 1: Sign In

User signs in with:

- Google login, or
- Email magic link.

No WhatsApp/SMS login in V0.

### Step 2: Create Agency

Required:

- Agency name.
- Slug/public URL.

Optional/skippable:

- Logo.
- Full profile.
- Long description.

### Step 3: Add First Listing

This is the activation action.

Required minimum:

- Title.
- Price or price-on-request.
- Location.
- Property type.
- 3 photos where possible.
- Basic contact owner/agent.

### Step 4: Agency Page Is Live

Show the public page immediately after the first listing is created.

This is the "wow" moment:

- Public URL visible.
- Listing appears on the page.
- Share action available.

### Step 5: Add WhatsApp Contact

WhatsApp number is required as contact/routing data, not as auth.

Use it for:

- Public CTA.
- Listing share templates.
- Buyer reply links.

### Step 6: Invite Team

Skippable with "Just me for now".

Owner can invite:

- Manager.
- Agent.
- Viewer.

Manager invite limits apply only after the agency is operating.

### Step 7: Receive First Lead

Close the loop by prompting the broker to:

- Share agency page.
- Share listing link.
- Use `wa.me` share link.
- Test or receive first web form lead.

Activation target: first real lead in the inbox.

---

## 8. Phased Implementation Order

### Phase 1: Production Auth and Tenant Boundary

Build first because it is expensive to retrofit.

Scope:

- Google login.
- Email magic link.
- `agency_users`.
- `agency_memberships`.
- `agency_invitations`.
- Role constants and capability model.
- RLS for agency-scoped private data.
- Remove demo agency switcher.
- Load agency context from authenticated membership.
- Make private broker data inaccessible to anonymous users.

Exit criteria:

- A signed-in broker can only see their own agency context.
- Anonymous users cannot read private listings/leads.
- Cross-agency access tests fail as expected.

### Phase 2: Onboarding and Scoped Daily Workflow

Scope:

- Create agency flow.
- First listing flow.
- Public page preview/live path.
- Agency WhatsApp contact requirement.
- Listings scoped to agency and role.
- Leads scoped to agency and assignment.
- Lead notes/status.
- Team invite acceptance.

Exit criteria:

- New agency can onboard without admin manually selecting them.
- Owner can invite team.
- Agent can manage own listings/leads only.
- Viewer is read-only.

### Phase 3: Admin Controls and Review

Scope:

- Agency admin panel.
- User invite/remove/reset tools.
- Role management.
- Suspend agency.
- Listing review queue.
- Approve/reject listing.
- Audit log for editorial and dangerous actions.

Exit criteria:

- AREI Admin can support real agencies without raw DB edits.
- Listings cannot reach public market index without the intended review path.
- Suspensions and force actions are logged.

### Phase 4: Public Agency Page and Share/Lead Capture

Scope:

- Production public agency page.
- Public listing detail links.
- `wa.me` share links with listing context.
- Web form lead capture.
- Manual logging of WhatsApp leads.
- Property links suitable for WhatsApp/Facebook sharing.

Exit criteria:

- Broker can share a listing from phone to WhatsApp.
- Buyer can submit a lead from public page/listing.
- Lead appears in correct agency inbox and assigned/default routed.

### Phase 5: Premium and Custom Domain Later

Scope later:

- Premium feature flags.
- Custom domain.
- Branded property packs.
- Advanced WhatsApp/Cloud API.
- Additional seats/billing.

Do not start before core adoption is validated.

---

## 9. Risks

### RLS Mistakes

This is the highest-risk technical area. A single permissive policy can expose lead or listing data across agencies.

Mitigation:

- Write policy tests before real onboarding.
- Use deny-by-default.
- Keep public projections separate from private tables.
- Avoid raw table access from broker UI where a broker-safe view is clearer.

### Email Deliverability

Magic link completion depends on email arriving quickly.

Mitigation:

- Warm up sending domain before launch.
- Configure SPF, DKIM, DMARC.
- Track delivery and completion rates.
- Consider a 6-digit code fallback later if links are filtered.

### Role Creep

Custom roles and per-permission toggles will slow the product and confuse small agencies.

Mitigation:

- Lock V0 to Owner, Manager, Agent, Viewer.
- Use one agency-level "agents see all leads" toggle.
- Use one per-agent "can publish directly" flag only if policy requires it.

### Mock Data Leaking Into Production

Mock Pulse, viewings, and notifications can damage trust if presented as real.

Mitigation:

- Remove mock data before production onboarding.
- Clearly label preview modules.
- Hide unfinished features behind flags.

### Admin Impersonation Risk

Impersonation is useful for support but dangerous for trust.

Mitigation:

- Do not build impersonation in early V0.
- Later, feature-flag it.
- Require ticket/reference.
- Log every action with `impersonated_by`.

---

## 10. Testing Plan

Testing should focus on authorization and cross-agency isolation before UI polish.

### Permission and RLS Tests

Required tests:

- Agent cannot see another agency's leads.
- Agent cannot see another agency's private listings.
- Agent cannot edit another agent's listing unless policy explicitly allows it.
- Agent can edit own listing.
- Agent can update status/notes only on assigned leads.
- Owner can invite users.
- Owner can remove Manager/Agent/Viewer.
- Manager can invite Agent/Viewer.
- Manager cannot invite Owner.
- Manager cannot change billing or premium settings.
- Viewer is read-only across listings and leads.
- Broker cannot publish directly to the public market index if policy disallows it.
- Suspended agency cannot create listings or receive public leads.
- Admin can approve/reject listings through review queue.
- Admin actions write audit logs.
- Market listings remain public read-only.
- Market Access never exposes private lead/contact metrics from other agencies.

### App Flow Tests

Required tests:

- New user signs in and creates agency.
- New agency adds first listing.
- Public agency page renders after onboarding.
- WhatsApp contact is required before activation completion.
- Invite acceptance creates correct membership.
- Role-specific navigation and actions render correctly.
- Public lead form creates a lead under the correct agency.
- `wa.me` links include listing context without requiring WhatsApp login.

### Regression Tests Before Real Broker Onboarding

Before inviting real agencies:

- Run cross-agency isolation tests against seeded multi-agency data.
- Verify no anonymous access to private tables.
- Verify no mock data appears in production routes.
- Verify admin-only fields do not appear in broker API responses or UI.
- Verify public market projection remains read-only.

---

## Final Recommendation

The production foundation should be built in this order:

1. Auth and tenant boundary.
2. Memberships, roles, invitations, and RLS.
3. Remove demo agency switcher and load agency context from membership.
4. Onboarding sequence: sign in, create agency, first listing, public page, WhatsApp contact, optional team invite, first lead.
5. Scoped listings/leads with assignment and notes.
6. AREI Admin controls: agency support, user reset, listing review queue, audit log.
7. Production public agency page, `wa.me` sharing, and lead capture.
8. Premium features only after real broker usage validates the core loop.

### Blockers Before Real Broker Onboarding

Do not onboard real brokers with real data until these are done:

- Production auth is live.
- Private broker tables no longer allow anonymous read/write.
- Agency context comes from membership, not demo selection.
- Cross-agency RLS tests pass.
- Owner/Manager/Agent/Viewer permissions are enforced server-side.
- Lead contact data is agency-isolated.
- Admin can approve/reject listings without raw DB edits.
- Mock features are hidden or clearly labeled.
- Audit logs exist for admin editorial and dangerous actions.
