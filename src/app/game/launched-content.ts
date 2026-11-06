import type { EpicDefinition, LaunchedPerk, WorldGoal } from '../models/launched.model.ts';

/** Perks of level 2. Level 1 perks that were never activated are gone after the launch. */
export const launchedPerks: LaunchedPerk[] = [
  {
    id: 'workflow-abstraction',
    name: 'Abstract the Automation Workflow',
    description: 'Wrap scripts, bots and pipelines into one orchestration layer. The board runs itself, so the server is free for epics.',
    icon: 'WF',
    actionsRequired: 35000
  }
];

/** The problems the platform sets out to fix. Goals without epics are not shown yet. */
export const worldGoals: WorldGoal[] = [
  { id: 'climate', name: 'Climate Change', feature: 'Green World' },
  { id: 'war', name: 'War', feature: 'Conflict Early Warning' },
  { id: 'hunger', name: 'Hunger', feature: 'Food Supply Tracker' },
  { id: 'poverty', name: 'Poverty', feature: 'Aid Distribution Network' },
  { id: 'corruption', name: 'Corruption', feature: 'Public Spending Watchdog' }
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
  }
];
