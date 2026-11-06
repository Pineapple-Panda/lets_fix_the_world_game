import type {
  EpicDefinition, LaunchedPerk, LawsuitCase, ProductDefinition, ProgramDefinition, RentalClient, WorldGoal, WorldProblem
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
    id: 'data-centers',
    name: 'Migrate to Data Centers',
    description: 'Move the systems off the shared server into dedicated data centres. Every epic runs twice as fast, and the electricity bill grows accordingly.',
    icon: 'DC',
    actionsRequired: 80000,
    cost: 350000
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
    income: 1000,
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
    id: 'nsa',
    name: 'NSA',
    description: 'Needs five servers for “metadata research”. Pays generously, signs anytime and already knows you said yes.',
    income: 1000,
    progress: {},
    integrity: -0.1,
    slots: 5
  },
  {
    id: 'edisonx',
    name: 'EdisonX',
    description: 'A billionaire’s rocket-car-tunnel-AI conglomerate. Pays brilliantly. Asks no questions you would like to answer.',
    income: 2500,
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

  // Special epics unlocked by programs, outside the world goal chains.
  {
    id: 'data-center-green-connector',
    goal: 'infrastructure',
    title: 'Upgrade Data Center Infrastructure Connector',
    detail: 'Plug the data centres straight into the optimised solar and wind farms. From now on they run entirely on green energy.',
    cost: 1500000,
    duration: 180,
    requiresProgram: 'renewables-optimization',
    requiresPerk: 'data-centers',
    climateBoost: 20
  },
  {
    id: 'weapons-kill-switch',
    goal: 'special',
    title: 'Kill Switch Virus for High-Tech Weapons',
    detail: 'Every upgraded weapon on the planet runs your firmware. Hide a kill switch in it: one command, and they all turn into very expensive paperweights.',
    cost: 3000000,
    duration: 240,
    requiresProgram: 'weapons-lobbying'
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

/**
 * Programs of the product cards (Green World, Fair Share). They run continuously: each second they cost upkeep
 * and add solution progress. They need integrity: nothing runs at 0%, and below 50% protests can stop them.
 */
export const programs: ProgramDefinition[] = [
  {
    id: 'reforestation-network',
    product: 'green-world',
    problem: 'climate',
    name: 'Community Reforestation Network',
    detail: 'Connects 10,000 volunteers with land that needs trees. Snacks not included.',
    cost: 200000,
    upkeep: 100,
    rate: 0.002
  },
  {
    id: 'methane-leak-watch',
    product: 'green-world',
    problem: 'climate',
    name: 'Methane Leak Watch',
    detail: 'Satellite data finds leaking pipelines. Operators suddenly very cooperative.',
    cost: 400000,
    upkeep: 200,
    rate: 0.004,
    slots: 1
  },
  {
    id: 'smart-grid-scheduler',
    product: 'green-world',
    problem: 'climate',
    name: 'Smart Grid Scheduler',
    detail: 'Charges cars when the wind blows, not when the influencer posts.',
    cost: 600000,
    upkeep: 300,
    rate: 0.005,
    minVersion: 1.1
  },
  {
    id: 'carbon-price-lobbying',
    product: 'green-world',
    problem: 'climate',
    name: 'Carbon Price Lobbying',
    detail: 'Politely explains to parliament what a spreadsheet is.',
    cost: 800000,
    upkeep: 0,
    rate: 0.008,
    minIntegrity: 60
  },
  {
    id: 'greenwashing-campaign',
    product: 'green-world',
    problem: 'climate',
    name: 'Greenwashing Campaign',
    detail: 'Paint it green, call it a day.',
    cost: 0,
    upkeep: -500,
    rate: 0.001,
    integrity: -0.05
  },
  {
    id: 'renewables-optimization',
    product: 'green-world',
    problem: 'climate',
    name: 'Solar Panel and Wind Turbine Efficiency Optimization',
    detail: 'Tilts every panel a few degrees and teaches turbines to face the wind. Engineers call it a breakthrough; the wind calls it Tuesday.',
    cost: 0,
    upkeep: 1000,
    rate: 0.01,
    minActions: 1500000,
    milestoneRate: 1,
    milestoneLabel: 'Optimisation',
    unlocksEpic: 'data-center-green-connector'
  },

  // Fair Share
  {
    id: 'mealora-delivery',
    product: 'fair-share',
    problem: 'hunger',
    name: 'Mealora Worldwide Food Delivery',
    detail: 'Builds a worldwide delivery service that brings surplus food from farms, markets and restaurants to the people who need it. The couriers ride e-bikes, mostly.',
    cost: 1000000,
    upkeep: 500,
    rate: 0.006,
    slots: 1
  },
  {
    id: 'hunger-relief-pricing',
    product: 'fair-share',
    problem: 'hunger',
    name: 'Fair Plate Pricing for Online Food Orders',
    detail: 'A pricing system for online food orders that passes 5% of every payment on to hunger relief funds. Nobody misses the 5%, everybody notices the full plates.',
    cost: 1500000,
    upkeep: 0,
    rate: 0.008,
    minVersion: 1.1
  },
  {
    id: 'free-meal-service',
    product: 'fair-share',
    problem: 'hunger',
    name: 'Free Meal Service for the Global South',
    detail: 'The Fair Plate share pays for the food, the Mealora network delivers it: free meals for the countries hit hardest by hunger. Only works while both programs run.',
    cost: 3000000,
    upkeep: 2000,
    rate: 0.02,
    minVersion: 2,
    minProgress: 30,
    requiresPrograms: ['mealora-delivery', 'hunger-relief-pricing']
  },
  {
    id: 'fair-wage-optimizer',
    product: 'fair-share',
    problem: 'poverty',
    name: 'Fair Wage Business Optimizer',
    detail: 'A platform that scans how employers work and automatically suggests business optimisations, so they can afford to raise wages significantly. The savings go to the payroll, not the yacht.',
    cost: 1200000,
    upkeep: 600,
    rate: 0.006,
    slots: 1
  },
  {
    id: 'essentials-tax-relief',
    product: 'fair-share',
    problem: 'poverty',
    name: 'Tax Relief on Food and Rent',
    detail: 'Models the budget impact down to the last loaf of bread and makes the case to governments for cutting taxes on food and rent. Turns out spreadsheets can be very persuasive.',
    cost: 2000000,
    upkeep: 0,
    rate: 0.008,
    minIntegrity: 60
  },
  {
    id: 'housing-market-stabilizer',
    product: 'fair-share',
    problem: 'poverty',
    name: 'Stabilize the Housing Market',
    detail: 'Matches empty flats with the people who need them, flags speculative vacancy and shows cities where to build next. Rents stop climbing faster than EdisonX rockets.',
    cost: 2500000,
    upkeep: 1000,
    rate: 0.012,
    minVersion: 1.1
  },

  // Peace & Integrity
  {
    id: 'deescalation-chatbot',
    product: 'peace-integrity',
    problem: 'war',
    name: 'Diplomatic De-escalation Chatbot',
    detail: 'Reads every tense message between two governments and drafts the reply that calms things down instead. Has never once written “with all due respect”.',
    cost: 800000,
    upkeep: 400,
    rate: 0.006,
    slots: 1
  },
  {
    id: 'tax-the-rich',
    product: 'peace-integrity',
    problem: 'corruption',
    name: 'Tax the Rich',
    detail: 'Follows the money through offshore accounts, shell companies and suspiciously cheap yachts, and hands the evidence to tax offices worldwide. Billionaires call it harassment, everybody else calls it fair.',
    cost: 1000000,
    upkeep: 0,
    rate: 0.008,
    minIntegrity: 50
  },
  {
    id: 'high-tech-weapons',
    product: 'peace-integrity',
    problem: 'war',
    name: 'Build High-Tech Weapons',
    detail: 'Smart drones, autonomous tanks, lasers on everything. The order books pay very well. Peace does not.',
    cost: 0,
    upkeep: -3000,
    rate: -0.006,
    integrity: -0.05
  },
  {
    id: 'weapons-lobbying',
    product: 'peace-integrity',
    problem: 'war',
    name: 'Lobby for High-Tech Weapons',
    detail: 'Convinces every army on the planet to replace or upgrade its old weapons with your high-tech ones. All of them, with the same firmware. Only works while you build the weapons.',
    cost: 1500000,
    upkeep: 1000,
    rate: 0,
    milestoneRate: 1.5,
    milestoneLabel: 'Weapons replaced or upgraded',
    requiresPrograms: ['high-tech-weapons'],
    unlocksEpic: 'weapons-kill-switch'
  },
  {
    id: 'destroy-all-weapons',
    product: 'peace-integrity',
    problem: 'war',
    name: 'Destroy All Weapons on the Planet',
    detail: 'Sends the kill switch. Every weapon on Earth shuts down, and the recycling plants melt them into wind turbines.',
    cost: 5000000,
    upkeep: 2000,
    rate: 0.05,
    requiresEpic: 'weapons-kill-switch'
  }
];

/**
 * Flimsy lawsuits. Once a product's work starts to hurt their business (30% solution of its problem) and the
 * platform looks squeaky clean (integrity above 80%), these companies drag you to court.
 */
export const lawsuits: LawsuitCase[] = [
  // Green World
  { product: 'green-world', plaintiff: 'Mississippi Corp', accusation: 'claims your reforestation network casts “unauthorised shade” on its soy fields.' },
  { product: 'green-world', plaintiff: 'Mississippi Corp', accusation: 'says your methane maps violate the trade secret of “how much our cows burp”.' },
  { product: 'green-world', plaintiff: 'Bananas Inc.', accusation: 'alleges that a stable climate destroys the market for its premium hurricane-resistant bananas.' },
  { product: 'green-world', plaintiff: 'Bananas Inc.', accusation: 'sues for defamation because your dashboard listed its plantations next to the word “deforestation”.' },
  { product: 'green-world', plaintiff: 'EdisonX', accusation: 'demands damages because your smart grid made its rocket launches look “energetically embarrassing”.' },
  { product: 'green-world', plaintiff: 'EdisonX', accusation: 'claims to have invented wind, and wants royalties.' },
  // Fair Share
  { product: 'fair-share', plaintiff: 'Mississippi Corp', accusation: 'says free surplus food is “unfair competition” for its premium soy snacks.' },
  { product: 'fair-share', plaintiff: 'Mississippi Corp', accusation: 'claims your delivery routes trespass on the airspace above its warehouses.' },
  { product: 'fair-share', plaintiff: 'Bananas Inc.', accusation: 'alleges that full stomachs reduce the demand for its “emergency bananas”.' },
  { product: 'fair-share', plaintiff: 'Bananas Inc.', accusation: 'sues because your pricing system rounds its banana prices to the nearest honest number.' },
  { product: 'fair-share', plaintiff: 'EdisonX', accusation: 'claims to have invented lunch, and wants royalties.' },
  { product: 'fair-share', plaintiff: 'EdisonX', accusation: 'demands damages because your e-bike couriers are faster than its delivery rockets.' }
];
