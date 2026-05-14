Archived reference only. Do not run. Original script used service-role access and immediate database mutations.

This preserves the one-off editorial publishing script for historical context only.
It is intentionally stored as Markdown instead of executable JavaScript.
No secret values are included.

```js
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config();

const svc = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── ARCHIVE: noise, duplicates, off-topic ────────────────────────────────────
const archiveIds = [
  "42ebfabe-3db8-45ab-9481-59a9fe8170ac", // WJAR RI flights — duplicate, lower quality
  "f645cbea-5dd2-443f-8a4b-30d4df6ef75b", // FSDG Microsoft Flight Simulator add-on
  "d2f0c879-65a3-4dc6-a2e2-58ebf24efc3c", // Providence Journal travel piece — duplicate
  "df8ba251-13f5-4b42-a1b0-d975548175be", // Airport press release RI — duplicate
  "9ed04300-cf5d-400b-b66b-5d4f58ee2856", // Aviation.Direct transatlantic — duplicate
  "35919ef2-7f5c-44b0-988f-b8af026a5dbb", // 737 MAX relaunch — technical duplicate
  "c378af3f-d47b-4f8a-aad0-f555266cc347", // AviTrader airports growth — duplicate of VINCI
  "25886c04-e02f-4d6c-b34a-9c104f06a748", // Marriott "Everything You Need To Know" — duplicate
  "5dd27719-6a11-4173-a3d7-ec0ba35a89f9", // Marriott Travel And Tour World — duplicate
  "5a5cbfdc-9cd0-4c99-ac90-d7a9dd56e974", // Marriott Hotel News Resource — duplicate
  "3911dff3-9d96-4ab3-ad37-fb2b2e8c8fa7", // Marriott Nomad Lawyer — duplicate
  "d7873cc0-df15-46ec-a0c2-1e4304cdae03", // Marriott Travel And Tour World 2 — duplicate
  "ca183da2-b516-47b5-9add-775e044d986a", // Marriott Atta Travel — duplicate
  "9bd51a5f-936b-4130-af44-ec103d80ef99", // Marriott FTN — duplicate
  "3fe18e93-4a2b-47e0-90fe-08e0b830ed98", // Legal Alert IP Code — duplicate
  "e7da3f87-813b-4f30-a3f0-d2b73950042e", // Sand looters 2022 — 4-year-old story
  "ee06ff8d-ba2c-4927-86d8-afd28bb0e05b", // Governo quote fragment — no editorial context
  "2dac7252-bb01-4f0b-ae9b-d081db4d46bf", // Health ministry internal lists
  "4b413174-569b-4082-aeef-57dc517c85d9", // Public sector HR census
];

// ── PUBLISH: with editorial improvements ─────────────────────────────────────
const publishItems = [
  {
    id: "5e90a02b-0f06-4add-a34a-2be6cf83371c",
    title: "Cabo Verde Airlines to Resume U.S. Transatlantic Service in Mid-2026",
    snippet:
      "Cabo Verde Airlines is set to restore nonstop transatlantic service between the U.S. East Coast and Cape Verde by mid-2026, ending a multi-year gap. The route links Providence, Rhode Island and is expected to significantly boost long-haul tourist arrivals.",
    why_it_matters:
      "Direct U.S. connections are the primary driver of long-haul visitor arrivals to Cape Verde. Resumed transatlantic service supports hotel occupancy and short-term rental demand, particularly on Sal and São Vicente.",
  },
  {
    id: "802ea44e-bd26-4652-92ad-db8e2a585e69",
    title: "Cape Verde Launches Direct Flights to Northeast Brazil",
    snippet:
      "A new direct air route between Cape Verde and northeast Brazil has launched, strengthening ties with one of the country's largest diaspora and leisure source markets. The service opened weekly connections from Recife, supporting cross-Atlantic travel and second-home demand.",
    why_it_matters:
      "Direct Brazil connectivity opens a high-value diaspora and leisure market. Cape Verde's lusophone ties with Brazil drive demand for second-home purchases and holiday lets, particularly on Sal and Boa Vista.",
  },
  {
    id: "828456e3-40f7-4b43-94db-7fce1de598d4",
    title: "Cape Verde Awards Airport Ground Handling Contract to Swissport",
    snippet:
      "Cape Verde has contracted Swissport, the world's largest independent aviation services provider, to manage ground operations at its international airports. The move professionalises ground handling and reflects Cape Verde's growing ambition as a regional aviation hub.",
    why_it_matters:
      "Professional ground handling improves airport reliability and turnaround times, directly supporting the airline capacity growth Cape Verde needs to meet tourism arrival targets. Operational standards at airports feed directly into hospitality sector performance.",
  },
  {
    id: "5ea3c639-1594-41d4-9ec0-74fbd9d936cb",
    title: "Cape Verde Domestic Travel Market Has Significant Unmet Demand",
    snippet:
      "Industry analysis identifies substantial unmet demand in Cape Verde's inter-island travel market, with existing routes too sparse and expensive to serve the full archipelago. The gap constrains tourism flows to secondary islands and suppresses property demand outside the main resort hubs.",
    why_it_matters:
      "Inter-island connectivity gaps limit property demand on Fogo, Santo Antão and smaller islands. Recognition of this structural gap signals potential investment in domestic routes and the resorts that depend on affordable inter-island access.",
  },
  {
    id: "d08ee577-0a4b-4d8a-9e3d-101a1b743aff",
    title: "Aviation Week: Cabo Verde Airlines Plans Return to U.S. Routes",
    snippet:
      "Industry publication Aviation Week reported that Cabo Verde Airlines is planning to restart U.S. operations, a significant step toward restoring the transatlantic capacity that underpins Cape Verde's tourism-driven economy. The airline is evaluating routes and fleet deployment ahead of relaunch.",
    why_it_matters:
      "Early confirmation from a leading industry source of resumed U.S. routes gives hotel and real estate investors a planning signal on long-haul demand recovery. Advance bookings and operator confidence tend to move ahead of route launch dates.",
  },
  {
    id: "cd02a793-b6ee-4739-9687-4114cf06de3b",
    title: "CVsky Airline Launches Domestic Routes Ahead of Cape Verde Summer Season",
    snippet:
      "New Cape Verde carrier CVsky has announced a domestic inter-island route network ahead of summer, entering a market that has historically been underserved. The airline targets routes between islands that lack reliable scheduled connections, aiming to improve access to secondary destinations.",
    why_it_matters:
      "New domestic competition could reduce inter-island travel costs and increase frequency, making secondary islands more accessible for tourists and property buyers. Cheaper domestic flights are a structural enabler for resort development beyond Sal and Boa Vista.",
  },
  {
    id: "23a16b65-7037-4f6b-8066-2e2aaf0df70b",
    title: "VINCI Airports Completes Cape Verde Modernisation Programme and Launches Phase 2",
    snippet:
      "VINCI Airports has completed its Phase 1A modernisation programme across Cape Verde's international airports and announced a new phase of investment covering further capacity expansion and infrastructure upgrades. The programme covers multiple island airports including Sal and Santiago.",
    why_it_matters:
      "Expanded and modernised airport infrastructure is a prerequisite for the tourist arrival growth that sustains Cape Verde's property market. Phase 2 investment signals a multi-year commitment by one of the world's largest airport operators, reducing infrastructure risk for hospitality developers.",
  },
  {
    id: "925f48cf-c400-4a20-8fef-e5ea4e8bfd8a",
    title: "Cape Verde Government Guarantees €4.7M Loan for National Airline TACV",
    snippet:
      "The Cape Verde government has guaranteed a €4.7 million loan for state carrier TACV, providing financial backing to sustain operations and fund planned route expansion including the return of U.S. transatlantic services.",
    why_it_matters:
      "Government backing for the national carrier de-risks near-term airline operations and protects the transatlantic route capacity that underpins Cape Verde's tourism-driven property market. State support signals political commitment to maintaining international air access.",
  },
  {
    id: "d9f785d8-48c2-4d38-8674-38352ad1d6e9",
    title: "Cape Verde's 2025 Industrial Property Code: Structural Reform for Investors",
    snippet:
      "Legal analysis from Inventa examines Cape Verde's updated industrial property code, describing it as a shift from incremental adjustment to structural modernisation. The new framework reforms patent registration, trademark protection and licensing provisions relevant to commercial and technology investors.",
    why_it_matters:
      "Modernised IP law reduces regulatory friction for international developers and investors in commercial, technology and branded hospitality assets. Stronger protections improve the risk-adjusted return for foreign capital deploying in Cape Verde's growing commercial sector.",
  },
  {
    id: "b0575a2e-cfe3-47d0-b1ab-15edf080ad59",
    title: "Marriott Opens First Cape Verde Property — Four Points by Sheraton São Vicente",
    snippet:
      "Marriott International has opened its first property in Cape Verde with the launch of Four Points by Sheraton São Vicente, also marking the brand's first Africa debut. The beachfront resort brings internationally recognised service standards to the island and represents a landmark in Cape Verde's hospitality market.",
    why_it_matters:
      "Marriott's entry into Cape Verde marks a step-change in branded hospitality investment. International brand presence signals sustained operator confidence in tourist demand and typically raises the benchmark for resort-adjacent residential values.",
    category: "Foreign investment",
  },
  {
    id: "35f47bda-956e-42d9-ae05-2ae7c37de410",
    title: "Macau Legend Says It Has Not Abandoned Cape Verde Casino-Resort Project",
    snippet:
      "Macau Legend Holdings has stated it has not abandoned its stalled hotel-casino development on Sal island, following the Cape Verde government's partial assumption of control over the unfinished site. The company says it intends to find a structured resolution to advance the project.",
    why_it_matters:
      "The Macau Legend site on Sal is one of Cape Verde's largest unresolved hospitality investments. Revival under any structure — Macau Legend, government, or new investor — would materially affect Sal's resort supply pipeline and land values.",
  },
  {
    id: "6f3c43e4-25c0-4065-9a15-086f5d97f9e0",
    title: "Cape Verde Government Assumes Control of Stalled Macau Legend Hotel-Casino Site",
    snippet:
      "The Cape Verde government has taken over the unfinished Macau Legend hotel-casino development on Sal island after years of delays. The takeover is intended to break the deadlock and determine the future use of one of the country's most prominent development sites.",
    why_it_matters:
      "Government intervention unlocks a site that has tied up significant resort land on Sal island. The resolution — whether public redevelopment or re-tendering to a new investor — will shape Sal's tourism and investment landscape for the next decade.",
  },
  {
    id: "19cb0efc-c7d3-4cce-9b7d-edc3b1384d33",
    title: "Cape Verde Enacts New Industrial Property Code",
    snippet:
      "Cape Verde's National Assembly approved a new industrial property code updating the framework governing patents, trademarks and related IP rights. The legislation modernises protections that international investors rely on for commercial, technology and brand-related ventures.",
    why_it_matters:
      "Legal certainty on IP protections is a baseline requirement for international commercial investment in Cape Verde. The new code reduces regulatory risk for developers of technology parks, branded commercial assets and media ventures.",
  },
  {
    id: "baf89c46-d9dd-4863-8e15-ce9e0bb41c14",
    title: "Portuguese Law Firm Morais Leitão Expands Network to Cape Verde",
    snippet:
      "Morais Leitão, one of Portugal's leading law firms, has expanded its network to include Cape Verde, adding local legal capacity for cross-border transactions. The firm advises on real estate, M&A, corporate and regulatory matters relevant to international investors.",
    why_it_matters:
      "Expansion of a tier-one Portuguese law firm into Cape Verde reflects growing demand for structured legal advisory on property transactions and foreign direct investment. It signals deeper integration with Portugal's investor and developer base.",
  },
  {
    id: "f1d7dc3a-e525-4c74-b40e-8f9b6731c223",
    title: "Nestenn International Real Estate Franchise Launches in Cape Verde",
    snippet:
      "French real estate franchise Nestenn has launched operations in Cape Verde, establishing a local agency to serve both domestic and international buyers. The network brings structured sales processes and international marketing reach to Cape Verde's growing property market.",
    why_it_matters:
      "An international franchise agency launch signals institutional confidence in the depth of the Cape Verde property market and improves transaction liquidity by giving international buyers a structured, familiar buying process.",
    category: "Foreign investment",
  },
  {
    id: "dedd106b-f47b-4b20-a902-3707782ad2d1",
    title: "VINCI Airports Announces Phase 2 Investment in Cape Verde After Completing Phase 1",
    snippet:
      "VINCI Airports has announced a new phase of investment in Cape Verde following completion of its Phase 1A airport modernisation programme in 2025. The investment covers further capacity expansion and infrastructure improvements across the archipelago.",
    why_it_matters:
      "Phase 2 airport investment confirms VINCI's long-term commitment to Cape Verde's aviation infrastructure. Expanded capacity at key airports removes a structural constraint on the tourist arrival growth that the hospitality and property markets depend on.",
  },
  {
    id: "77da16a6-340b-45ee-81d0-36eceed54daa",
    title: "Cape Verde Publishes State Budget Guidelines for 2027",
    snippet:
      "The Cape Verde government has published its macroeconomic and fiscal guidelines for the 2027 state budget, setting the framework for public investment priorities across infrastructure, social sectors and economic development.",
    why_it_matters:
      "Budget guidelines set forward government direction on infrastructure spending, tourism investment and economic incentives — the three policy levers most directly linked to property market conditions and foreign investor confidence in Cape Verde.",
    category: "Policy / regulation",
  },
];

async function run() {
  // 1. Archive
  console.log(`Archiving ${archiveIds.length} noisy/duplicate items…`);
  const { error: archErr } = await svc
    .from("market_news")
    .update({ status: "archived" })
    .in("id", archiveIds);
  if (archErr) { console.error("Archive failed:", archErr.message); process.exit(1); }
  console.log("  archived OK");

  // 2. Update editorial fields and publish
  console.log(`\nPublishing ${publishItems.length} items with editorial improvements…`);
  let ok = 0, fail = 0;
  for (const item of publishItems) {
    const payload = {
      title: item.title,
      snippet: item.snippet,
      why_it_matters: item.why_it_matters,
      status: "published",
      ...(item.category ? { category: item.category } : {}),
    };
    const { error } = await svc.from("market_news").update(payload).eq("id", item.id);
    if (error) { console.error("  FAIL", item.id.slice(0, 8), error.message); fail++; }
    else { console.log("  OK  ", item.title.slice(0, 65)); ok++; }
  }
  console.log(`\nPublished: ${ok}  Failed: ${fail}`);

  // 3. Final counts
  const { data: fin } = await svc.from("market_news").select("status");
  const fc = (fin || []).reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  console.log("Final DB counts:", JSON.stringify(fc));

  // 4. Confirm anon still sees only published
  const { createClient: cc } = await import("@supabase/supabase-js");
  const anon = cc(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: anonRows } = await anon.from("market_news").select("id,status");
  const anonNonPub = (anonRows || []).filter(r => r.status !== "published");
  console.log(`Anon sees ${(anonRows||[]).length} rows, ${anonNonPub.length} non-published (expect 0)`);
}

run().catch(console.error);
```
