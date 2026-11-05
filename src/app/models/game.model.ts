import type { Item } from './item.model.ts';
import type { PerkId } from './perk.model.ts';
import type { AppVersion } from './version.model.ts';

export interface Game {
  items: Item[];
  selected: string | null;
  automationTarget: string | null;
  actions: number;
  budget: number;
  lastDeploymentActions: number;
  appVersion: AppVersion;
  testCoverage: number;
  bugCount: number;
  seconds: number;
  activatedPerks: PerkId[];
  archivedIds: string[];
  deployments: number;
  assistants: number;
  assistantUpgrades: number;
  agentTargets: (string | null)[];
  agentCarry: number[];
}
