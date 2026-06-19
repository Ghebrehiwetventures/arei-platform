/* Common buyer questions for Cape Verde property purchase.
   These power the FAQ block on /blog (Guides) and feed the
   knowledge-base search alongside articles. Answers are written to be
   factually careful and were last fact-checked against official sources
   on 18 June 2026 — see the legal/source note rendered below the FAQ in
   BlogList. Keep them accurate over glanceable; do not re-add removed
   generalisations (e.g. "freehold", fixed timelines, fixed fee bands). */

export interface FaqEntry {
  question: string;
  answer: string;
  topic: "Buying" | "Legal" | "Tax" | "Money" | "Residence" | "Practical";
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: "Can foreigners buy property in Cape Verde?",
    answer:
      "Yes. Foreign nationals may buy privately owned real estate in Cape Verde under the same general investment framework regardless of nationality. Each purchase remains subject to title, cadastral, planning, tax and registration checks. Verify the exact legal interest shown in the title rather than describing every property generically as “freehold.”",
    topic: "Buying",
  },
  {
    question: "Do I need a Cape Verdean tax number to buy?",
    answer:
      "Yes. Obtain a Cape Verde NIF before completion; each person registered as a buyer should expect to need one. DNRE issues it free through Repartições de Finanças or Casa do Cidadão. A non-resident individual must appoint a legal representative domiciled in Cape Verde for the NIF application.",
    topic: "Legal",
  },
  {
    question: "Do I need a local bank account?",
    answer:
      "A local bank account is commonly used, but requirements vary by bank, financing and transaction structure. Confirm the payment and source-of-funds route with your bank, lawyer and notary before sending money. The escudo is pegged at CVE 110.265 per euro.",
    topic: "Money",
  },
  {
    question: "What taxes apply when buying property?",
    answer:
      "From 1 January 2026, ITI applies to property transfers and IPI to ownership. ITI is generally 1% of taxable value, rising to 3% where the seller or buyer benefits from a privileged tax regime. Other transaction costs may apply; verify the matriz predial, registo predial, taxable value, tax clearance and any exemption or surcharge.",
    topic: "Tax",
  },
  {
    question: "How long does the buying process take?",
    answer:
      "There is no guaranteed standard timeline. Completion depends on title and cadastral regularity, due diligence, tax clearance, financing and notary/registry readiness. Any reservation deposit is contractual; record its amount, conditions and refundability in writing and have it reviewed before payment.",
    topic: "Practical",
  },
  {
    question: "Do I need a Cape Verdean lawyer?",
    answer:
      "Independent Cape Verde legal advice is strongly recommended. Use a lawyer who does not act for the seller to check title, registrations, debts, planning status, contracts and tax position. Fees vary, so obtain a written scope and quote. Remote completion may be possible under a properly executed power of attorney.",
    topic: "Legal",
  },
  {
    question: "Can I get a mortgage in Cape Verde?",
    answer:
      "Yes, some banks offer mortgages to non-residents, subject to underwriting. As reviewed in June 2026, Caixa advertises loans in CVE or EUR, financing up to 70%, with at least a 30% buyer contribution. Rates and approval are bank- and borrower-specific; confirm current terms directly with the lender.",
    topic: "Money",
  },
  {
    question: "Does owning property give me residency?",
    answer:
      "No. Property ownership by itself does not grant residence. A qualifying residential purchase may support a Green Card application at statutory thresholds of €80,000 or €120,000, depending on the municipality’s GDP category, and must be paid with funds transferred from abroad. The application requires supporting documents and approval; other residence routes are separate.",
    topic: "Residence",
  },
  {
    question: "Are there annual property taxes?",
    answer:
      "Yes. Since 1 January 2026, IPI applies at a general rate of 0.1% of taxable value. The 0.15% rate applies specifically to land classified for construction, not all land. The amount due can be increased for vacant, ruined or degraded unsafe urban property and for unfinished principal façades.",
    topic: "Tax",
  },
  {
    question: "Can I rent out the property when I'm not there?",
    answer:
      "Yes, subject to lease, tourism, tax and licensing rules. Tourist stays in apartments, villas or rooms fall under the Alojamento Complementar (AC) regime, which requires registration/licensing and collection of the tourist contribution. An individual applicant or company manager who is a foreign national must submit a Cape Verde residence title or proof of a residence application; a nonresident owner should confirm the correct licensed operating structure.",
    topic: "Practical",
  },
  {
    question: "Which island is best for investment?",
    answer:
      "There is no universally best island. Compare the exact location, legal title, total operating costs, occupancy, long-term demand and resale depth. Treat island-wide yield or liquidity rankings cautiously unless they are supported by a current, disclosed dataset.",
    topic: "Buying",
  },
  {
    question: "Can I repatriate the proceeds when I sell?",
    answer:
      "Generally yes, but not without conditions. External investors may convert and transfer sale proceeds after satisfying applicable obligations, provided the investment was properly registered with Banco de Cabo Verde. Expect the bank or BCV to request sale, tax, registration, source-of-funds and AML/FX documentation; exceptional timing controls are possible.",
    topic: "Money",
  },
];
