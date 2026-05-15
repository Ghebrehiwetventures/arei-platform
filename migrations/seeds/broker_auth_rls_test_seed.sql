-- ============================================================
-- Test seed: Broker Auth / RLS Tenant Fixtures
-- ============================================================
-- PURPOSE:
--   Deterministic local fixtures for validating broker auth tenant isolation.
--   This seed is for local/staging RLS tests only.
--
-- IMPORTANT:
--   agency_users.auth_user_id references auth.users(id). Supabase Auth users
--   must exist before this seed is applied. In local testing, create auth users
--   with the fixed IDs below or replace the IDs with local auth.users IDs.
--
-- Auth user placeholders:
--   aaaaaaaa-0000-0000-0000-000000000001  agency A owner
--   aaaaaaaa-0000-0000-0000-000000000002  agency A manager
--   aaaaaaaa-0000-0000-0000-000000000003  agency A agent
--   aaaaaaaa-0000-0000-0000-000000000004  agency A viewer
--   bbbbbbbb-0000-0000-0000-000000000001  agency B owner
--   bbbbbbbb-0000-0000-0000-000000000002  agency B agent
--
-- Expected checks after applying:
--   - Agency A users cannot read Agency B private leads/listings.
--   - Agency B users cannot read Agency A private leads/listings.
--   - Viewer can read but cannot mutate through authenticated policies.
--   - Agent has no mutation policies in Phase 1. Mutation rules (assigned/own rows only)
--     are deferred to Phase 2 along with authenticated INSERT/UPDATE paths.
--   - broker.market_listings_view remains public/read-only and is not seeded here.
--
-- This seed intentionally does not touch agency_relationships.
-- ============================================================

-- ── Agencies ──────────────────────────────────────────────────────────────

insert into public.agencies (
  id, market_code, agency_name, public_display_name,
  email, phone, whatsapp, website, description,
  source_ids, claimed_status, data_partner_status,
  agents_can_see_all_leads,
  created_at, updated_at
) values
(
  'aaaaaaaa-1000-0000-0000-000000000001',
  'cv',
  'Broker RLS Test Agency A',
  'Broker RLS Test Agency A',
  'agency-a@example.test',
  '+238 900 0001',
  '+238 900 0001',
  'https://agency-a.example.test',
  'Local RLS test agency A.',
  '{}',
  'claimed',
  'none',
  false,
  now(),
  now()
),
(
  'bbbbbbbb-1000-0000-0000-000000000001',
  'cv',
  'Broker RLS Test Agency B',
  'Broker RLS Test Agency B',
  'agency-b@example.test',
  '+238 900 0002',
  '+238 900 0002',
  'https://agency-b.example.test',
  'Local RLS test agency B.',
  '{}',
  'claimed',
  'none',
  false,
  now(),
  now()
)
on conflict (id) do nothing;
-- ── Agency users ──────────────────────────────────────────────────────────

insert into public.agency_users (
  id, auth_user_id, email, full_name, phone, whatsapp, status, created_at, updated_at
) values
(
  'aaaaaaaa-2000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'agency-a-owner@example.test',
  'Agency A Owner',
  '+238 910 0001',
  '+238 910 0001',
  'active',
  now(),
  now()
),
(
  'aaaaaaaa-2000-0000-0000-000000000002',
  'aaaaaaaa-0000-0000-0000-000000000002',
  'agency-a-manager@example.test',
  'Agency A Manager',
  '+238 910 0002',
  '+238 910 0002',
  'active',
  now(),
  now()
),
(
  'aaaaaaaa-2000-0000-0000-000000000003',
  'aaaaaaaa-0000-0000-0000-000000000003',
  'agency-a-agent@example.test',
  'Agency A Agent',
  '+238 910 0003',
  '+238 910 0003',
  'active',
  now(),
  now()
),
(
  'aaaaaaaa-2000-0000-0000-000000000004',
  'aaaaaaaa-0000-0000-0000-000000000004',
  'agency-a-viewer@example.test',
  'Agency A Viewer',
  '+238 910 0004',
  '+238 910 0004',
  'active',
  now(),
  now()
),
(
  'bbbbbbbb-2000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000001',
  'agency-b-owner@example.test',
  'Agency B Owner',
  '+238 920 0001',
  '+238 920 0001',
  'active',
  now(),
  now()
),
(
  'bbbbbbbb-2000-0000-0000-000000000002',
  'bbbbbbbb-0000-0000-0000-000000000002',
  'agency-b-agent@example.test',
  'Agency B Agent',
  '+238 920 0002',
  '+238 920 0002',
  'active',
  now(),
  now()
)
on conflict (id) do nothing;

-- ── Memberships ───────────────────────────────────────────────────────────

insert into public.agency_memberships (
  id, agency_id, agency_user_id, role, status, can_publish_directly, created_at, updated_at
) values
(
  'aaaaaaaa-3000-0000-0000-000000000001',
  'aaaaaaaa-1000-0000-0000-000000000001',
  'aaaaaaaa-2000-0000-0000-000000000001',
  'owner',
  'active',
  false,
  now(),
  now()
),
(
  'aaaaaaaa-3000-0000-0000-000000000002',
  'aaaaaaaa-1000-0000-0000-000000000001',
  'aaaaaaaa-2000-0000-0000-000000000002',
  'manager',
  'active',
  false,
  now(),
  now()
),
(
  'aaaaaaaa-3000-0000-0000-000000000003',
  'aaaaaaaa-1000-0000-0000-000000000001',
  'aaaaaaaa-2000-0000-0000-000000000003',
  'agent',
  'active',
  false,
  now(),
  now()
),
(
  'aaaaaaaa-3000-0000-0000-000000000004',
  'aaaaaaaa-1000-0000-0000-000000000001',
  'aaaaaaaa-2000-0000-0000-000000000004',
  'viewer',
  'active',
  false,
  now(),
  now()
),
(
  'bbbbbbbb-3000-0000-0000-000000000001',
  'bbbbbbbb-1000-0000-0000-000000000001',
  'bbbbbbbb-2000-0000-0000-000000000001',
  'owner',
  'active',
  false,
  now(),
  now()
),
(
  'bbbbbbbb-3000-0000-0000-000000000002',
  'bbbbbbbb-1000-0000-0000-000000000001',
  'bbbbbbbb-2000-0000-0000-000000000002',
  'agent',
  'active',
  false,
  now(),
  now()
)
on conflict (id) do nothing;

-- ── Invitations ───────────────────────────────────────────────────────────
-- token_hash values in this seed are local test strings only. Production must
-- store a cryptographic hash of the actual invitation token, never the raw token.

insert into public.agency_invitations (
  id, agency_id, email, role, status, token_hash,
  invited_by_agency_user_id, expires_at, created_at, updated_at
) values
(
  'aaaaaaaa-4000-0000-0000-000000000001',
  'aaaaaaaa-1000-0000-0000-000000000001',
  'pending-agent-a@example.test',
  'agent',
  'pending',
  'local-test-token-hash-a',
  'aaaaaaaa-2000-0000-0000-000000000001',
  now() + interval '14 days',
  now(),
  now()
),
(
  'bbbbbbbb-4000-0000-0000-000000000001',
  'bbbbbbbb-1000-0000-0000-000000000001',
  'pending-viewer-b@example.test',
  'viewer',
  'pending',
  'local-test-token-hash-b',
  'bbbbbbbb-2000-0000-0000-000000000001',
  now() + interval '14 days',
  now(),
  now()
)
on conflict (id) do nothing;

-- ── Listings ──────────────────────────────────────────────────────────────

insert into public.broker_pilot_listings (
  id, agency_id, market_code,
  title, price, currency, property_type,
  island, city,
  bedrooms, bathrooms, property_size_sqm,
  description, image_urls, source_url,
  contact_name, contact_email, contact_phone,
  publish_status,
  created_by_agency_user_id, assigned_agent_id,
  created_at, updated_at
) values
(
  'aaaaaaaa-5000-0000-0000-000000000001',
  'aaaaaaaa-1000-0000-0000-000000000001',
  'cv',
  'Agency A RLS test listing',
  150000,
  'EUR',
  'Apartment',
  'Sal',
  'Santa Maria',
  2,
  1,
  80,
  'Agency A listing used for local RLS isolation testing.',
  array['https://example.test/a1.jpg', 'https://example.test/a2.jpg', 'https://example.test/a3.jpg'],
  null,
  'Agency A Agent',
  'agency-a-agent@example.test',
  '+238 910 0003',
  'draft',
  'aaaaaaaa-2000-0000-0000-000000000003',
  'aaaaaaaa-2000-0000-0000-000000000003',
  now(),
  now()
),
(
  'bbbbbbbb-5000-0000-0000-000000000001',
  'bbbbbbbb-1000-0000-0000-000000000001',
  'cv',
  'Agency B RLS test listing',
  250000,
  'EUR',
  'Villa',
  'Boa Vista',
  'Sal Rei',
  3,
  2,
  140,
  'Agency B listing used for local RLS isolation testing.',
  array['https://example.test/b1.jpg', 'https://example.test/b2.jpg', 'https://example.test/b3.jpg'],
  null,
  'Agency B Agent',
  'agency-b-agent@example.test',
  '+238 920 0002',
  'draft',
  'bbbbbbbb-2000-0000-0000-000000000002',
  'bbbbbbbb-2000-0000-0000-000000000002',
  now(),
  now()
)
on conflict (id) do nothing;

-- ── Leads ─────────────────────────────────────────────────────────────────

insert into public.leads (
  id, agency_id, listing_id, assigned_agent_id,
  buyer_name, buyer_phone, buyer_email, buyer_whatsapp,
  message, source, status, follow_up_date, notes,
  created_at, updated_at
) values
(
  'aaaaaaaa-6000-0000-0000-000000000001',
  'aaaaaaaa-1000-0000-0000-000000000001',
  'aaaaaaaa-5000-0000-0000-000000000001',
  'aaaaaaaa-2000-0000-0000-000000000003',
  'Agency A Buyer',
  '+351 910 100 001',
  'buyer-a@example.test',
  '+351 910 100 001',
  'I am interested in the Agency A test listing.',
  'form',
  'new',
  current_date + 2,
  'Assigned to Agency A Agent.',
  now(),
  now()
),
(
  'bbbbbbbb-6000-0000-0000-000000000001',
  'bbbbbbbb-1000-0000-0000-000000000001',
  'bbbbbbbb-5000-0000-0000-000000000001',
  'bbbbbbbb-2000-0000-0000-000000000002',
  'Agency B Buyer',
  '+351 920 100 001',
  'buyer-b@example.test',
  '+351 920 100 001',
  'I am interested in the Agency B test listing.',
  'form',
  'new',
  current_date + 3,
  'Assigned to Agency B Agent.',
  now(),
  now()
)
on conflict (id) do nothing;
