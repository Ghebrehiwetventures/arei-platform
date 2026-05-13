-- ============================================================
-- Demo seed: Broker Pilot Workspace V0.1
-- ============================================================
-- PURPOSE: Provides a realistic, demo-ready dataset for broker meetings.
--          Covers all listing quality states and submission lifecycle stages.
--
-- SAFE TO RE-RUN: All inserts use ON CONFLICT DO NOTHING with fixed UUIDs.
--                 Re-running will not create duplicates or alter existing rows.
--
-- DATA: Entirely fictional. "Archipelago Real Estate" does not exist.
--       All contact details, URLs, and prices are made up.
--
-- APPLY ORDER:
--   1. Run migrations 031, 032, 033 first.
--   2. Then apply this seed.
--
-- HOW TO RESET: Run the reset block at the bottom of this file.
-- ============================================================

-- ── Fixed IDs (deterministic — safe to re-run) ──────────────────────────────

-- Agency
-- 11111111-0000-0000-0000-000000000001

-- Pilot listings (8)
-- 22222222-0000-0000-0000-000000000001  strong (published)
-- 22222222-0000-0000-0000-000000000002  missing price (draft)
-- 22222222-0000-0000-0000-000000000003  missing sqm (draft, recommended only)
-- 22222222-0000-0000-0000-000000000004  missing photos (draft, fails required)
-- 22222222-0000-0000-0000-000000000005  stale listing (draft, old date)
-- 22222222-0000-0000-0000-000000000006  duplicate-risk (draft)
-- 22222222-0000-0000-0000-000000000007  ready for review (all required pass)
-- 22222222-0000-0000-0000-000000000008  published (strong, approved)

-- Submissions (3)
-- 33333333-0000-0000-0000-000000000001  pending (submitted)
-- 33333333-0000-0000-0000-000000000002  approved
-- 33333333-0000-0000-0000-000000000003  rejected


-- ============================================================
-- AGENCY
-- ============================================================

insert into agencies (
  id, market_code, agency_name, public_display_name, contact_person,
  email, phone, whatsapp, website, description,
  source_ids, claimed_status, data_partner_status,
  created_at, updated_at
) values (
  '11111111-0000-0000-0000-000000000001',
  'cv',
  'Archipelago Real Estate (DEMO)',
  'Archipelago Real Estate',
  'Maria da Silva',
  'demo@archipelago-cv.example',
  '+238 991 0000',
  '+238 991 0000',
  'https://www.archipelago-cv.example',
  'Cape Verde''s premier boutique real estate agency, specialising in beachfront villas, apartments, and land across Boa Vista, Sal, and Santiago. Founded 2011. Licensed by the Cape Verde Association of Real Estate Professionals.',
  '{}',
  'invited',
  'interested',
  now() - interval '45 days',
  now() - interval '3 days'
) on conflict (id) do nothing;


-- ============================================================
-- AGENCY RELATIONSHIP (internal CRM — never shown to broker)
-- ============================================================

insert into agency_relationships (
  agency_id, relationship_status, priority, lead_quality,
  relationship_owner, last_contacted_at, next_follow_up_at,
  internal_notes, created_at, updated_at
) values (
  '11111111-0000-0000-0000-000000000001',
  'meeting_booked',
  'high',
  'strong',
  'AREI Founding Team',
  now() - interval '5 days',
  now() + interval '2 days',
  'Met at property expo in Mindelo — October. Very receptive to pilot. Operates 40+ listings across Boa Vista and Sal. Maria is the right contact; co-founder handles operations. Ask about data exclusivity in Boa Vista.',
  now() - interval '45 days',
  now() - interval '3 days'
) on conflict (agency_id) do nothing;


-- ============================================================
-- PILOT LISTINGS
-- ============================================================

-- ── 1. STRONG LISTING (published) ───────────────────────────────────────────
-- All required + recommended checks pass. Currently published.

insert into broker_pilot_listings (
  id, agency_id, market_code,
  title, price, currency, property_type,
  island, city,
  bedrooms, bathrooms, property_size_sqm,
  description,
  image_urls, source_url,
  contact_name, contact_email, contact_phone,
  publish_status, reviewer_notes, reviewed_by, reviewed_at,
  created_at, updated_at
) values (
  '22222222-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  'cv',
  '3-bedroom beachfront villa with private pool — Sal Rei, Boa Vista',
  285000, 'EUR', 'Villa',
  'Boa Vista', 'Sal Rei',
  3, 2, 210,
  'Stunning three-bedroom villa set 80 metres from the beach in Sal Rei, the main town of Boa Vista. The property features an open-plan living area opening onto a covered terrace, a private swimming pool, and landscaped gardens. All three bedrooms are en-suite. The kitchen is fully equipped with European appliances. Air conditioning throughout. Quiet residential street, walking distance to restaurants, shops, and the ferry terminal. Strong rental history with proven occupancy from April to October.',
  array[
    'https://picsum.photos/seed/bvvilla1/800/600',
    'https://picsum.photos/seed/bvvilla2/800/600',
    'https://picsum.photos/seed/bvvilla3/800/600',
    'https://picsum.photos/seed/bvvilla4/800/600',
    'https://picsum.photos/seed/bvvilla5/800/600'
  ],
  'https://www.archipelago-cv.example/listings/bv-villa-sal-rei-001',
  'Maria da Silva', 'demo@archipelago-cv.example', '+238 991 0000',
  'published',
  'Strong listing. All fields complete. Good photos. Published to public feed.',
  'AREI Admin',
  now() - interval '10 days',
  now() - interval '20 days',
  now() - interval '10 days'
) on conflict (id) do nothing;


-- ── 2. MISSING PRICE (draft) ─────────────────────────────────────────────────
-- Fails required check: no price. Cannot be marked ready for review.

insert into broker_pilot_listings (
  id, agency_id, market_code,
  title, price, currency, property_type,
  island, city,
  bedrooms, bathrooms, property_size_sqm,
  description,
  image_urls, source_url,
  contact_name, contact_email, contact_phone,
  publish_status,
  created_at, updated_at
) values (
  '22222222-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000001',
  'cv',
  '2-bedroom apartment with sea view — Santa Maria, Sal',
  null, 'EUR', 'Apartment',
  'Sal', 'Santa Maria',
  2, 1, 95,
  'Bright two-bedroom apartment on the second floor of a well-maintained building in Santa Maria, Sal. Panoramic sea views from the main balcony. Open-plan kitchen and living area. Short walk to the beach and the main promenade. Ideal for buyers seeking a lock-up-and-leave holiday property or a buy-to-let investment. The development has an on-site pool and 24-hour security.',
  array[
    'https://picsum.photos/seed/salapt1/800/600',
    'https://picsum.photos/seed/salapt2/800/600',
    'https://picsum.photos/seed/salapt3/800/600'
  ],
  'https://www.archipelago-cv.example/listings/sal-apt-santa-maria-002',
  'Maria da Silva', 'demo@archipelago-cv.example', '+238 991 0000',
  'draft',
  now() - interval '14 days',
  now() - interval '14 days'
) on conflict (id) do nothing;


-- ── 3. MISSING SQM (draft) ───────────────────────────────────────────────────
-- Passes all required checks. Fails recommended: no sqm.

insert into broker_pilot_listings (
  id, agency_id, market_code,
  title, price, currency, property_type,
  island, city,
  bedrooms, bathrooms, property_size_sqm,
  description,
  image_urls, source_url,
  contact_name, contact_email, contact_phone,
  publish_status,
  created_at, updated_at
) values (
  '22222222-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000001',
  'cv',
  'Renovated 3-bedroom townhouse in Mindelo historic centre — São Vicente',
  175000, 'EUR', 'Townhouse',
  'São Vicente', 'Mindelo',
  3, 2, null,
  'Beautifully renovated Portuguese colonial townhouse in the heart of Mindelo, São Vicente. Retains original azulejo tile work and high ceilings while offering modern amenities throughout. Three bedrooms across two floors. Rooftop terrace with views over the bay. Walking distance to all amenities, including the municipal market, restaurants, and the harbour. Mindelo is the cultural capital of Cape Verde and home to a thriving expat community.',
  array[
    'https://picsum.photos/seed/svtown1/800/600',
    'https://picsum.photos/seed/svtown2/800/600',
    'https://picsum.photos/seed/svtown3/800/600',
    'https://picsum.photos/seed/svtown4/800/600'
  ],
  'https://www.archipelago-cv.example/listings/sv-townhouse-mindelo-003',
  'Maria da Silva', 'demo@archipelago-cv.example', '+238 991 0000',
  'draft',
  now() - interval '10 days',
  now() - interval '10 days'
) on conflict (id) do nothing;


-- ── 4. MISSING PHOTOS (draft) ────────────────────────────────────────────────
-- Only 1 photo provided. Fails required check (3 minimum).
-- Cannot advance to ready_for_review.

insert into broker_pilot_listings (
  id, agency_id, market_code,
  title, price, currency, property_type,
  island, city,
  bedrooms, bathrooms, property_size_sqm,
  description,
  image_urls, source_url,
  contact_name, contact_email, contact_phone,
  publish_status,
  created_at, updated_at
) values (
  '22222222-0000-0000-0000-000000000004',
  '11111111-0000-0000-0000-000000000001',
  'cv',
  'Ocean-view building plot — Ribeira Grande, Santo Antão',
  45000, 'EUR', 'Land',
  'Santo Antão', 'Ribeira Grande',
  null, null, 800,
  'Flat building plot of 800 m² with unobstructed ocean views in Ribeira Grande, the main town of Santo Antão. Planning permission approved for a 3-bedroom villa. Services connected to the boundary. Santo Antão is a hiking destination and one of the most lush and green islands in the archipelago. Steady demand from European buyers seeking rural retreats.',
  array[
    'https://picsum.photos/seed/saland1/800/600'
  ],
  'https://www.archipelago-cv.example/listings/sa-land-ribeira-grande-004',
  'Maria da Silva', 'demo@archipelago-cv.example', '+238 991 0000',
  'draft',
  now() - interval '8 days',
  now() - interval '8 days'
) on conflict (id) do nothing;


-- ── 5. STALE LISTING (draft) ─────────────────────────────────────────────────
-- Created 90 days ago, never updated. Signals possible off-market property.
-- (The pilot quality check does not currently flag staleness — this is a
-- visual demo of the scenario; staleness is flagged in the pipeline console.)

insert into broker_pilot_listings (
  id, agency_id, market_code,
  title, price, currency, property_type,
  island, city,
  bedrooms, bathrooms, property_size_sqm,
  description,
  image_urls, source_url,
  contact_name, contact_email, contact_phone,
  publish_status,
  created_at, updated_at
) values (
  '22222222-0000-0000-0000-000000000005',
  '11111111-0000-0000-0000-000000000001',
  'cv',
  'Studio apartment near city beach — Praia, Santiago',
  65000, 'EUR', 'Apartment',
  'Santiago', 'Praia',
  0, 1, 42,
  'Compact studio apartment on the fifth floor of a modern building in Praia, the capital of Cape Verde. Sea views from the balcony. Open-plan layout with a kitchenette. Air conditioning. The building has secure underground parking. Well connected by bus to all parts of the city. Suitable as an investment property with strong local rental demand.',
  array[
    'https://picsum.photos/seed/praia1/800/600',
    'https://picsum.photos/seed/praia2/800/600',
    'https://picsum.photos/seed/praia3/800/600'
  ],
  'https://www.archipelago-cv.example/listings/sg-studio-praia-005',
  'Maria da Silva', 'demo@archipelago-cv.example', '+238 991 0000',
  'draft',
  now() - interval '90 days',
  now() - interval '90 days'
) on conflict (id) do nothing;


-- ── 6. DUPLICATE-RISK LISTING (draft) ────────────────────────────────────────
-- Very similar price, island, and bedroom count to listing 1.
-- Demonstrates the scenario where two submissions look like the same property.

insert into broker_pilot_listings (
  id, agency_id, market_code,
  title, price, currency, property_type,
  island, city,
  bedrooms, bathrooms, property_size_sqm,
  description,
  image_urls, source_url,
  contact_name, contact_email, contact_phone,
  publish_status,
  created_at, updated_at
) values (
  '22222222-0000-0000-0000-000000000006',
  '11111111-0000-0000-0000-000000000001',
  'cv',
  '3-bed villa with pool, close to beach — Boa Vista',
  280000, 'EUR', 'Villa',
  'Boa Vista', 'Sal Rei',
  3, 2, 195,
  'Three-bedroom villa with private pool situated a short drive from Chaves beach, Boa Vista. Open-plan living and dining area with direct pool access. Master bedroom with en-suite and sea-view terrace. Modern kitchen fully fitted. Landscaped garden with barbecue area. Good rental potential. Part of a small managed development with shared facilities.',
  array[
    'https://picsum.photos/seed/bvdup1/800/600',
    'https://picsum.photos/seed/bvdup2/800/600',
    'https://picsum.photos/seed/bvdup3/800/600'
  ],
  null,
  'Carlos Mendes', 'carlos@archipelago-cv.example', '+238 991 0001',
  'draft',
  now() - interval '5 days',
  now() - interval '5 days'
) on conflict (id) do nothing;


-- ── 7. READY FOR REVIEW (all required checks pass) ──────────────────────────
-- Strong listing, broker has marked as ready. Awaiting AREI review.

insert into broker_pilot_listings (
  id, agency_id, market_code,
  title, price, currency, property_type,
  island, city,
  bedrooms, bathrooms, property_size_sqm,
  description,
  image_urls, source_url,
  contact_name, contact_email, contact_phone,
  publish_status,
  created_at, updated_at
) values (
  '22222222-0000-0000-0000-000000000007',
  '11111111-0000-0000-0000-000000000001',
  'cv',
  '4-bedroom luxury villa with panoramic ocean views — Rabil, Boa Vista',
  390000, 'EUR', 'Villa',
  'Boa Vista', 'Rabil',
  4, 3, 280,
  'Exceptional four-bedroom villa perched on a hillside above Rabil, offering 180-degree views across the Atlantic. Built to a high specification with Italian porcelain tiles, a bespoke kitchen, and a 12-metre infinity pool. The master suite occupies the entire upper floor with a private terrace and outdoor shower. Three further double bedrooms, all en-suite. Large covered terrace ideal for outdoor dining. Private driveway and garage. Rabil is a traditional village five minutes from Sal Rei and fifteen minutes from Chaves beach, one of the finest in Cape Verde.',
  array[
    'https://picsum.photos/seed/bvlux1/800/600',
    'https://picsum.photos/seed/bvlux2/800/600',
    'https://picsum.photos/seed/bvlux3/800/600',
    'https://picsum.photos/seed/bvlux4/800/600',
    'https://picsum.photos/seed/bvlux5/800/600',
    'https://picsum.photos/seed/bvlux6/800/600'
  ],
  'https://www.archipelago-cv.example/listings/bv-villa-rabil-007',
  'Maria da Silva', 'demo@archipelago-cv.example', '+238 991 0000',
  'ready_for_review',
  now() - interval '18 days',
  now() - interval '2 days'
) on conflict (id) do nothing;


-- ── 8. SECOND PUBLISHED LISTING ──────────────────────────────────────────────
-- Published. Demonstrates a second live listing in the count.

insert into broker_pilot_listings (
  id, agency_id, market_code,
  title, price, currency, property_type,
  island, city,
  bedrooms, bathrooms, property_size_sqm,
  description,
  image_urls, source_url,
  contact_name, contact_email, contact_phone,
  publish_status, reviewer_notes, reviewed_by, reviewed_at,
  created_at, updated_at
) values (
  '22222222-0000-0000-0000-000000000008',
  '11111111-0000-0000-0000-000000000001',
  'cv',
  '2-bedroom apartment in beachfront development — Santa Maria, Sal',
  145000, 'EUR', 'Apartment',
  'Sal', 'Santa Maria',
  2, 1, 88,
  'Two-bedroom apartment in a sought-after beachfront development in Santa Maria, Sal. Ground-floor unit with private garden and direct pool access. Open-plan living area with sliding doors onto the garden. Fully fitted kitchen with integrated appliances. The development has 24-hour security, a communal pool, and a restaurant. Santa Maria is the main tourist hub of Sal with a wide sandy beach, watersports, and a lively restaurant and bar scene. Strong rental demand year-round.',
  array[
    'https://picsum.photos/seed/salapt8a/800/600',
    'https://picsum.photos/seed/salapt8b/800/600',
    'https://picsum.photos/seed/salapt8c/800/600',
    'https://picsum.photos/seed/salapt8d/800/600'
  ],
  'https://www.archipelago-cv.example/listings/sal-apt-santa-maria-008',
  'Maria da Silva', 'demo@archipelago-cv.example', '+238 991 0000',
  'published',
  'Good photos, complete data, reasonable price for the area. Approved.',
  'AREI Admin',
  now() - interval '7 days',
  now() - interval '15 days',
  now() - interval '7 days'
) on conflict (id) do nothing;


-- ============================================================
-- AGENCY LISTING SUBMISSIONS
-- (for AgencyDataConsoleView — shows the data correction review queue)
-- Note: listing_id values below are placeholder text IDs.
-- They reference no real listing in public.listings.
-- Replace with real listing IDs from your pipeline if needed.
-- ============================================================

-- ── Submission 1: PENDING (submitted) ────────────────────────────────────────
-- Agency submitted a price correction for a pipeline listing.

insert into agency_listing_submissions (
  id, agency_id, listing_id,
  submission_type, status, payload,
  submitted_at, created_at, updated_at
) values (
  '33333333-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  'cv_archipelago_demo_001',
  'update_existing',
  'submitted',
  '{"price": 295000, "currency": "EUR", "notes": "Price was updated — listing was re-priced after the seller review last month."}',
  now() - interval '3 days',
  now() - interval '3 days',
  now() - interval '3 days'
) on conflict (id) do nothing;

-- ── Submission 2: APPROVED ────────────────────────────────────────────────────
-- Availability update: listing was sold.

insert into agency_listing_submissions (
  id, agency_id, listing_id,
  submission_type, status, payload,
  reviewer_notes, reviewed_by, submitted_at, reviewed_at,
  created_at, updated_at
) values (
  '33333333-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000001',
  'cv_archipelago_demo_002',
  'availability_update',
  'approved',
  '{"availability_status": "sold", "notes": "Property completed sale on 14 October. Buyer was a UK national. Can share completion certificate if required."}',
  'Confirmed via email with agency. Marked as sold in pipeline.',
  'AREI Admin',
  now() - interval '20 days',
  now() - interval '18 days',
  now() - interval '20 days',
  now() - interval '18 days'
) on conflict (id) do nothing;

-- ── Submission 3: REJECTED ────────────────────────────────────────────────────
-- Agency tried to add a new listing via the submission form but the payload
-- was incomplete (no price, no photos URL). Rejected with guidance.

insert into agency_listing_submissions (
  id, agency_id, listing_id,
  submission_type, status, payload,
  reviewer_notes, reviewed_by, submitted_at, reviewed_at,
  created_at, updated_at
) values (
  '33333333-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000001',
  null,
  'new_listing',
  'rejected',
  '{"title": "Land plot for sale, Santiago", "island": "Santiago", "city": "Assomada", "property_type": "Land"}',
  'Submission is missing price and photo URLs — the two fields required to publish. Please resubmit with a confirmed asking price and at least 3 photos. Use the Broker Pilot listing form for new listings going forward.',
  'AREI Admin',
  now() - interval '30 days',
  now() - interval '28 days',
  now() - interval '30 days',
  now() - interval '28 days'
) on conflict (id) do nothing;


-- ============================================================
-- RESET BLOCK (run this to wipe all demo data and start fresh)
-- ============================================================
-- Uncomment and run to reset. This deletes ALL rows with the demo IDs.
--
-- delete from agency_listing_submissions
--   where id in (
--     '33333333-0000-0000-0000-000000000001',
--     '33333333-0000-0000-0000-000000000002',
--     '33333333-0000-0000-0000-000000000003'
--   );
--
-- delete from broker_pilot_listings
--   where agency_id = '11111111-0000-0000-0000-000000000001';
--
-- delete from agency_relationships
--   where agency_id = '11111111-0000-0000-0000-000000000001';
--
-- delete from agencies
--   where id = '11111111-0000-0000-0000-000000000001';
