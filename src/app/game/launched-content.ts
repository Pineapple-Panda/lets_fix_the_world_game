import type { EpicDefinition, LaunchedPerk } from '../models/launched.model.ts';

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

/** Epics are big initiatives bought with budget and processed by the server, one per server slot. */
export const epics: EpicDefinition[] = [
  {
    id: 'climate-algorithm',
    title: 'Climate Change Mitigation Algorithm',
    detail: 'Crunch emission, satellite and policy data to find the measures with the biggest impact per euro.',
    cost: 5000,
    duration: 20
  }
];
