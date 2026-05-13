# Verified Agency & Verified Listing — Pilot Policy

**Status:** Pilot V0.1  
**Market:** Cape Verde (initial)  
**Applies to:** Agencies participating in the AREI Broker Pilot  
**Last updated:** 2026-05-12

---

## 1. Verified Agency

A Verified Agency is a real estate agency or property professional that has entered a data partnership with the Africa Real Estate Index (AREI), confirmed its identity and contact details, and taken active responsibility for the accuracy of the listing data attributed to it in the Index. Verification is not a legal certification and does not constitute AREI independently confirming the agency's regulatory standing, operating licences, or professional memberships in any jurisdiction. It is a data-quality signal: the agency has claimed its profile on the Index, confirmed the information shown is correct, and agreed to notify AREI of material changes. AREI has reviewed the agency record and approved it for Verified status. During the pilot, verification is granted manually on a per-agency basis by the AREI team.

---

## 2. Verified Listing

A Verified Listing is a property listing whose core data fields — price, location, property type, size, and photos — have been submitted or explicitly confirmed by the agency that holds the mandate to sell or let the property, and subsequently reviewed and approved for publication by AREI. A Verified Listing badge indicates that the data visible in the Index at the time of review was confirmed by the listing agency as accurate to the best of their knowledge. It does not indicate that AREI has independently inspected the property, verified legal title, confirmed planning permissions, or validated the asking price against market comparables. Listing data may change after verification; the badge reflects the state of the data at the time of the most recent agency confirmation and AREI review.

---

## 3. Requirements — Verified Agency

An agency qualifies for Verified Agency status when all of the following conditions are met:

**Identity**
- Agency name and trading name confirmed by a representative with authority to act on behalf of the agency
- Primary contact name, email address, and phone number provided and reachable
- Active website or verifiable online presence

**Profile completeness**
- Public display name set
- Agency description provided (minimum 50 characters)
- Market and country of operation confirmed

**Data partnership**
- Agency has submitted at least one pilot listing through the AREI intake process
- At least one listing has been reviewed and published by AREI
- Agency has acknowledged the AREI data submission guidelines (pilot: verbal or email confirmation)

**AREI review**
- AREI has reviewed the agency record and found no material inconsistency
- No open disputes or unresolved data quality issues at the time of verification

---

## 4. Requirements — Verified Listing

A listing qualifies for Verified Listing status when all of the following conditions are met:

**Data completeness (required)**
- Asking price present and confirmed by the agency
- At least 3 current photos confirmed by the agency as accurate representations of the property
- Island or municipality specified
- Property type specified

**Data completeness (recommended — improve listing rank)**
- Property size in square metres provided
- Number of bedrooms and bathrooms provided
- Description of 100 characters or more provided
- Agency contact details for the listing provided

**Agency confirmation**
- The listing was submitted directly by the agency (pilot: via the AREI intake form or by AREI staff on behalf of the agency with the agency's explicit sign-off)
- The agency has confirmed the listing is currently active and available

**AREI review**
- AREI has reviewed the submission and found no material data quality issue
- AREI has set the listing to Published status

---

## 5. What brokers get in return

**Verified Agency**
- A "Verified by Agency" badge displayed on the agency profile wherever it appears on the AREI public surface
- Eligibility for enhanced visibility in AREI's agency directory as verified data surfaces are developed (pilot: manual review; scaled: algorithmic)
- Attribution on every listing linked to the agency
- Direct buyer enquiries routed through the agency's confirmed contact details
- Access to the AREI Broker Pilot Workspace to submit and manage listings

**Verified Listing**
- A "Reviewed by AREI" badge displayed on the listing card and detail page
- Inclusion in the AREI verified listings filter on the public index (buyers can filter to verified listings only)
- Clearer visibility as a verified data partner in the index as verified data surfaces are developed
- Listing attributed clearly to the agency, with agency contact details

---

## 6. What AREI verifies and does not verify

### AREI verifies
- That the submitted data meets the minimum completeness thresholds defined above
- That the agency representative who submitted the listing has confirmed it is accurate to the best of their knowledge
- That the listing appears internally consistent (price, property type, location, and photos are broadly consistent with each other)
- That the agency profile information matches what is publicly available

### AREI does not verify
- Legal title or ownership of the property
- Planning permissions, building licences, or construction compliance
- The accuracy of the asking price relative to market value or comparable sales
- Whether the property is free of encumbrances, mortgages, or disputes
- The professional licences or regulatory standing of the agency in its jurisdiction
- That the property will be available at the time a buyer makes contact
- The accuracy of information that changes after the listing is published (price reductions, sold status, etc.)

AREI is a data index, not a legal or financial advisory service. Buyers and sellers should conduct independent due diligence before entering any transaction.

---

## 7. Disclaimer copy — broker tool (internal label)

> **About Verified status**  
> Verified Agency and Verified Listing badges indicate that the agency has confirmed this data and AREI has reviewed and approved it for publication. This is a data-quality signal. AREI does not verify legal title, property condition, planning status, or the accuracy of the asking price. Data may change after publication. Buyers should conduct independent due diligence before any transaction.

*(Display in the admin tool and any future broker-facing portal, adjacent to the Verified badge controls.)*

---

## 8. Public-facing badge tooltip copy

**Verified Agency tooltip:**
> This agency has confirmed its profile details with AREI and is an active data partner. AREI has reviewed and approved the agency record. This is a data-quality indicator, not a licence or regulatory certification.

**Verified Listing tooltip:**
> The listing agency has confirmed that this data — price, location, photos, and property details — was accurate at the time of submission. AREI has reviewed and published the listing. This badge does not verify legal title, property condition, or current availability.

*(Keep tooltips under 60 words. Recommended display: on hover over the badge on listing cards and agency profile pages.)*

---

## 9. Meeting-friendly explanation — plain English

**For agency principals:**

> "When we say Verified Agency, we mean we know who you are, we've confirmed your contact details, and we've linked your name to every listing you submit. You're not just a scraper result — you're a named agency that has actively engaged with the Index.
>
> When we say Verified Listing, we mean you told us the price, the location, the photos — and we checked that it all makes sense before publishing it. The buyer sees a badge that says your agency reviewed this data. That is a meaningful signal in a market where a lot of listings have missing prices or broken photos.
>
> What we are not saying: we have not inspected the property. We are not a lawyer or a surveyor. We are saying the data in the Index is what your agency said it is, and we thought that was good enough to publish.
>
> In a market where buyers struggle to trust any single portal, a badge that says 'the agency confirmed this' is the first step toward a more reliable index."

---

## Pilot scope note

During V0.1, Verified status is:
- Granted manually by the AREI team
- Recorded in the `agencies` table (`claimed_status = 'verified'`) and in individual `broker_pilot_listings` rows (`publish_status = 'published'`)
- Not displayed on the public surface yet — the badge infrastructure is V1 scope

The policy above defines what the badges will mean when they ship publicly. It can be shared with agencies now to set expectations during pilot conversations.
