import type {
  EpicDefinition, LaunchedPerk, ProductDefinition, RentalClient, WorldGoal, WorldProblem
} from '../models/launched.model.ts';

/** Perks of level 2. Level 1 perks that were never activated are gone after the launch. */
export const launchedPerks: LaunchedPerk[] = [
  {
    id: 'workflow-abstraction',
    name: 'Abstract the Automation Workflow',
    description: 'Wrap scripts, bots and pipelines into one orchestration layer. The board runs itself, so the server is free for epics.',
    icon: 'WF',
    actionsRequired: 35000
  },
  {
    id: 'network-financing',
    name: 'Who Pays for All This?',
    description: 'Lovely platform. Shame about the invoice. Opens the Network & Financing desk to find partners and money.',
    icon: 'NF',
    actionsRequired: 250000
  }
];

/** The five world problems, in the order of the progress bars. */
export const worldProblems: { id: WorldProblem; name: string }[] = [
  { id: 'climate', name: 'Climate change' },
  { id: 'war', name: 'War' },
  { id: 'hunger', name: 'Hunger' },
  { id: 'poverty', name: 'Poverty' },
  { id: 'corruption', name: 'Corruption' }
];

/** The goals epics are grouped into. Hunger and poverty are tackled together. */
export const worldGoals: WorldGoal[] = [
  { id: 'climate', name: 'Climate Change', problems: ['climate'] },
  { id: 'war', name: 'War', problems: ['war'] },
  { id: 'corruption', name: 'Corruption', problems: ['corruption'] },
  { id: 'hunger-poverty', name: 'Hunger & Poverty', problems: ['hunger', 'poverty'] }
];

/**
 * Clients that rent a server slot through Network & Financing. While a contract runs, each client pays a steady
 * income, adds (or removes) a tiny bit of solution progress every second and pushes integrity up or down.
 * Some clients only sign while integrity is high (idealists) or low (people who ask no questions).
 */
export const rentalClients: RentalClient[] = [
  {
    id: 'green-left-union',
    name: 'United Green-Left Federation of Europe',
    description: 'Seventeen committees, one shared spreadsheet, endless good intentions. Pays in fair-trade coffee vouchers, mostly.',
    income: 40,
    progress: { climate: 0.005 },
    integrity: 0.05,
    minIntegrity: 70
  },
  {
    id: 'blue-helmets',
    name: 'Office for Extremely Polite Peacekeeping',
    description: 'Brings biscuits to every negotiation. Small budget, big patience.',
    income: 60,
    progress: { war: 0.005 },
    integrity: 0.03
  },
  {
    id: 'ministry-digital',
    name: 'Ministry of Digital Transformation of Lower Bureaucratia',
    description: 'Wants a portal. Then another portal for the first portal. Pays reliably, eventually.',
    income: 150,
    progress: { hunger: 0.003, poverty: 0.003 },
    integrity: -0.05
  },
  {
    id: 'edisonx',
    name: 'EdisonX',
    description: 'A billionaire’s rocket-car-tunnel-AI conglomerate. Pays brilliantly. Asks no questions you would like to answer.',
    income: 400,
    progress: { climate: -0.005, corruption: -0.005 },
    integrity: -0.1,
    maxIntegrity: 20
  }
];

/**
 * Products appear as cards in the level 2 grid once all of their goals are reached.
 * War and corruption share one product, so their card needs both chains.
 */
export const products: ProductDefinition[] = [
  { id: 'peace-integrity', name: 'Peace & Integrity', goals: ['war', 'corruption'] },
  { id: 'fair-share', name: 'Fair Share', goals: ['hunger-poverty'] },
  { id: 'green-world', name: 'Green World', goals: ['climate'] }
];

/**
 * Epics are big initiatives bought with budget and processed by the server, one per server slot.
 * Within a goal they build on each other: the next one appears once the previous one is done.
 * Durations are in seconds.
 */
export const epics: EpicDefinition[] = [
  {
    id: 'climate-algorithm',
    goal: 'climate',
    title: 'Climate Change Mitigation Algorithm',
    detail: 'Crunch emission, satellite and policy data to find the measures with the biggest impact per euro.',
    cost: 5000,
    duration: 20
  },
  {
    id: 'climate-collect-measurements',
    goal: 'climate',
    title: 'Collect Historical Measurements',
    detail: 'Scrape decades of temperature, CO₂ and sea level records, some of them from servers that still speak FTP.',
    cost: 10000,
    duration: 120
  },
  {
    id: 'climate-aggregate-measurements',
    goal: 'climate',
    title: 'Aggregate the Measurements',
    detail: 'Bucket billions of readings by region and month so the data finally fits into memory.',
    cost: 15000,
    duration: 60
  },
  {
    id: 'climate-clean-data',
    goal: 'climate',
    title: 'Fit Maximum Likelihood and Drop Outliers',
    detail: 'Estimate the most likely values and throw out the sensor that reported 900 °C in Oslo.',
    cost: 20000,
    duration: 60
  },
  {
    id: 'climate-feed-algorithm',
    goal: 'climate',
    title: 'Feed the Algorithm',
    detail: 'Train the mitigation model on the cleaned data and hope the GPU bill stays below the climate budget.',
    cost: 25000,
    duration: 180
  },
  {
    id: 'climate-standalone-api',
    goal: 'climate',
    title: 'Implement Standalone Climate Changer API',
    detail: 'Wrap the model in its own versioned, rate-limited API so governments can call it without calling us.',
    cost: 700000,
    duration: 300
  },

  // War
  {
    id: 'war-early-warning',
    goal: 'war',
    title: 'Conflict Early Warning Model',
    detail: 'Score escalation risk from news, social media and local reports, before it trends on X.',
    cost: 8000,
    duration: 30
  },
  {
    id: 'war-satellite-imagery',
    goal: 'war',
    title: 'Ingest Satellite Imagery',
    detail: 'Detect troop movements and destroyed infrastructure from orbit.',
    cost: 15000,
    duration: 120
  },
  {
    id: 'war-verify-footage',
    goal: 'war',
    title: 'Verify Footage at Scale',
    detail: 'Geolocate videos and flag deepfakes. That “breaking” clip is from a 2014 video game.',
    cost: 20000,
    duration: 90
  },
  {
    id: 'war-safe-corridors',
    goal: 'war',
    title: 'Map Safe Corridors',
    detail: 'Live routing for evacuations and aid convoys, updated as front lines move.',
    cost: 30000,
    duration: 120
  },
  {
    id: 'war-mediation-channel',
    goal: 'war',
    title: 'Build a Secure Mediation Channel',
    detail: 'End-to-end encrypted negotiation rooms. No “reply all”. Ever.',
    cost: 40000,
    duration: 180
  },
  {
    id: 'war-ceasefire-api',
    goal: 'war',
    title: 'Ship the Ceasefire Monitoring API',
    detail: 'Real-time violation reports for observers and both sides of the table.',
    cost: 900000,
    duration: 360
  },

  // Corruption
  {
    id: 'corruption-procurement-data',
    goal: 'corruption',
    title: 'Scrape Public Procurement Data',
    detail: 'Collect tenders from 50 portals in 50 different PDF layouts.',
    cost: 8000,
    duration: 45
  },
  {
    id: 'corruption-ownership-graph',
    goal: 'corruption',
    title: 'Build the Beneficial Ownership Graph',
    detail: 'Find out who really owns Shell Company #4711 Ltd. (Spoiler: another shell company.)',
    cost: 15000,
    duration: 120
  },
  {
    id: 'corruption-bid-rigging',
    goal: 'corruption',
    title: 'Detect Bid-Rigging Patterns',
    detail: 'Flag tenders where the same three companies take turns winning.',
    cost: 20000,
    duration: 90
  },
  {
    id: 'corruption-money-trail',
    goal: 'corruption',
    title: 'Follow the Money Across Borders',
    detail: 'Link leaks, company registries and sanctions lists into one money trail.',
    cost: 30000,
    duration: 180
  },
  {
    id: 'corruption-whistleblower-drops',
    goal: 'corruption',
    title: 'Protect Whistleblower Drops',
    detail: 'Anonymous, Tor-friendly submissions with automatic metadata stripping.',
    cost: 35000,
    duration: 120
  },
  {
    id: 'corruption-watchdog-api',
    goal: 'corruption',
    title: 'Ship the Public Spending Watchdog API',
    detail: 'Real-time alerts for journalists and auditors when budgets go missing.',
    cost: 800000,
    duration: 300
  },

  // Hunger & Poverty
  {
    id: 'hunger-poverty-hotspots',
    goal: 'hunger-poverty',
    title: 'Map Food Insecurity Hotspots',
    detail: 'Combine harvest, price and weather data into one risk map.',
    cost: 6000,
    duration: 30
  },
  {
    id: 'hunger-poverty-crop-yields',
    goal: 'hunger-poverty',
    title: 'Predict Crop Yields',
    detail: 'Train a model on soil, rain and satellite vegetation data. Farmers already know, but now it has a dashboard.',
    cost: 12000,
    duration: 120
  },
  {
    id: 'hunger-poverty-distribution-routes',
    goal: 'hunger-poverty',
    title: 'Optimise Food Distribution Routes',
    detail: 'Solve the vehicle routing problem so trucks stop driving in circles.',
    cost: 18000,
    duration: 90
  },
  {
    id: 'hunger-poverty-market-prices',
    goal: 'hunger-poverty',
    title: 'Track Market Prices via SMS',
    detail: 'Farmers text local prices; no smartphone, no app store, no problem.',
    cost: 22000,
    duration: 60
  },
  {
    id: 'hunger-poverty-cash-transfers',
    goal: 'hunger-poverty',
    title: 'Launch Mobile Cash Transfers',
    detail: 'Send aid straight to phones, with fraud checks instead of middlemen.',
    cost: 35000,
    duration: 180
  },
  {
    id: 'hunger-poverty-microloans',
    goal: 'hunger-poverty',
    title: 'Score Microloans Without Bias',
    detail: 'Credit scoring based on repayment behaviour, not on postcode or surname.',
    cost: 45000,
    duration: 180
  },
  {
    id: 'hunger-poverty-fair-share-api',
    goal: 'hunger-poverty',
    title: 'Ship the Fair Share Platform API',
    detail: 'One API for food, cash and credit that any NGO can plug into.',
    cost: 1000000,
    duration: 420
  }
];
