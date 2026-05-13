-- ============================================================
-- Demo seed: Broker Workspace Leads (V0)
-- ============================================================
-- PURPOSE: Provides a realistic lead inbox for the Listo by AREI
--          broker workspace demo. Linked to the Archipelago Real
--          Estate (DEMO) agency and its existing pilot listings.
--
-- SAFE TO RE-RUN: Fixed UUIDs + ON CONFLICT DO NOTHING.
--
-- DEPENDS ON: broker_pilot_demo_seed.sql must be applied first.
--             Agency:  11111111-0000-0000-0000-000000000001
--             Listings: 22222222-0000-0000-0000-0000000000xx
--
-- RESET: run the DELETE block at the bottom of this file.
-- ============================================================

-- Fixed lead IDs
-- 44444444-0000-0000-0000-000000000001  new         — Rabil villa
-- 44444444-0000-0000-0000-000000000002  new         — Sal apartment (general)
-- 44444444-0000-0000-0000-000000000003  contacted   — Boa Vista beachfront
-- 44444444-0000-0000-0000-000000000004  viewing_booked — published villa
-- 44444444-0000-0000-0000-000000000005  negotiating — published villa
-- 44444444-0000-0000-0000-000000000006  lost        — Boa Vista land plot
-- 44444444-0000-0000-0000-000000000007  closed      — general agency enquiry
-- 44444444-0000-0000-0000-000000000008  new         — WhatsApp CTA click

insert into leads (
  id, agency_id, listing_id,
  buyer_name, buyer_phone, buyer_email, buyer_whatsapp,
  message, source, status,
  follow_up_date, notes,
  created_at, updated_at
) values

-- 1. New lead — enquiry about the Rabil 4-bed villa (listing 007, ready_for_review)
(
  '44444444-0000-0000-0000-000000000001',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000007',
  'Thomas Andersen',
  '+45 2212 3344',
  'thomas.andersen@example.dk',
  '+45 2212 3344',
  'Hello, I saw your listing for the 4-bedroom villa in Rabil. We are looking to buy in Boa Vista. Can you send more photos and confirm the land area? We are planning to visit in July.',
  'form',
  'new',
  (current_date + interval '2 days')::date,
  null,
  now() - interval '3 hours',
  now() - interval '3 hours'
),

-- 2. New lead — general Sal apartment enquiry (no specific listing)
(
  '44444444-0000-0000-0000-000000000002',
  '11111111-0000-0000-0000-000000000001',
  null,
  'Fatima Mendes',
  '+238 974 5512',
  'f.mendes@example.cv',
  '+238 974 5512',
  'Bom dia. Estou à procura de um apartamento em Sal, 2 quartos, entre 150.000 e 250.000 EUR. Têm alguma coisa disponível?',
  'whatsapp',
  'new',
  (current_date + interval '1 day')::date,
  'Portuguese speaker. Looking 150-250k EUR in Sal. Follow up by WhatsApp.',
  now() - interval '6 hours',
  now() - interval '6 hours'
),

-- 3. Contacted — Boa Vista beachfront villa (listing 001, published)
(
  '44444444-0000-0000-0000-000000000003',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  'Pierre Lefebvre',
  '+33 6 12 34 56 78',
  'p.lefebvre@example.fr',
  '+33 6 12 34 56 78',
  'Bonjour, je suis intéressé par la villa en front de mer. Quel est le statut juridique du bien? Est-il possible de visiter en août?',
  'form',
  'contacted',
  (current_date + interval '5 days')::date,
  'French buyer. Sent brochure by email 2026-05-12. Waiting for reply. Ask about August visit window.',
  now() - interval '2 days',
  now() - interval '1 day'
),

-- 4. Viewing booked — published villa (listing 008, published)
(
  '44444444-0000-0000-0000-000000000004',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000008',
  'Ingrid Svensson',
  '+46 70 123 4567',
  'ingrid.svensson@example.se',
  '+46 70 123 4567',
  'We visited your website and are very interested in the villa. We have a budget of around 350,000 EUR. Can we book a viewing for 20 May?',
  'form',
  'viewing_booked',
  (current_date + interval '7 days')::date,
  'Viewing confirmed for 20 May. Husband and wife. Flying from Stockholm. Bring printed spec sheet. Budget 350k EUR.',
  now() - interval '5 days',
  now() - interval '1 day'
),

-- 5. Negotiating — same published villa, second lead (listing 008)
(
  '44444444-0000-0000-0000-000000000005',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000008',
  'Marco Bianchi',
  '+39 333 456 7890',
  'm.bianchi@example.it',
  '+39 333 456 7890',
  'Ciao, ho visto la villa. Siamo seriamente interessati. Il prezzo è negoziabile? Possiamo fare un offerta?',
  'manual',
  'negotiating',
  (current_date + interval '3 days')::date,
  'Italian buyer, spoke by phone 2026-05-10. Offered 310,000. Counter-offer sent at 335,000. Waiting on response.',
  now() - interval '8 days',
  now() - interval '2 days'
),

-- 6. Lost — Boa Vista land plot (listing 004, fails required checks)
(
  '44444444-0000-0000-0000-000000000006',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000004',
  'James O''Brien',
  '+353 87 654 3210',
  'james.obrien@example.ie',
  '+353 87 654 3210',
  'Hi, I was looking at the land plot in Boa Vista. Do you have more details and photos? Is there planning permission?',
  'email',
  'lost',
  null,
  'Buyer found another plot. Closed 2026-05-09. Add better photos to the listing to avoid this.',
  now() - interval '12 days',
  now() - interval '4 days'
),

-- 7. Closed — general agency enquiry (no listing), became a client
(
  '44444444-0000-0000-0000-000000000007',
  '11111111-0000-0000-0000-000000000001',
  null,
  'Ana Correia',
  '+351 912 345 678',
  'ana.correia@example.pt',
  '+351 912 345 678',
  'Olá, gostaria de saber mais sobre as vossas propriedades em Santiago. Estou a pensar investir em Cape Verde.',
  'manual',
  'closed',
  null,
  'Purchased 2-bed apartment in Praia 2026-04-28. Great client. Ask for referrals.',
  now() - interval '30 days',
  now() - interval '14 days'
),

-- 8. New — WhatsApp CTA click on agency page, brief message
(
  '44444444-0000-0000-0000-000000000008',
  '11111111-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000007',
  'Lukas Müller',
  '+49 151 2345 6789',
  null,
  '+49 151 2345 6789',
  'Hi, I am interested in properties in Cape Verde. Do you have anything under 200,000 EUR?',
  'whatsapp',
  'new',
  (current_date + interval '1 day')::date,
  null,
  now() - interval '45 minutes',
  now() - interval '45 minutes'
)

on conflict (id) do nothing;

-- ============================================================
-- RESET BLOCK (run to wipe demo leads before re-seeding)
-- ============================================================

-- delete from leads where id in (
--   '44444444-0000-0000-0000-000000000001',
--   '44444444-0000-0000-0000-000000000002',
--   '44444444-0000-0000-0000-000000000003',
--   '44444444-0000-0000-0000-000000000004',
--   '44444444-0000-0000-0000-000000000005',
--   '44444444-0000-0000-0000-000000000006',
--   '44444444-0000-0000-0000-000000000007',
--   '44444444-0000-0000-0000-000000000008'
-- );
