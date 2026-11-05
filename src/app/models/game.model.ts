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
  /** Purchased manual coverage upgrades, each adding 0.005 pp per click. */
  manualCoverageUpgrades: number;
  /** Purchased automatic coverage upgrades, each adding 0.005 pp per second. */
  autoCoverageUpgrades: number;
  bugCount: number;
  seconds: number;
  activatedPerks: PerkId[];
  deployments: number;
  assistants: number;
  assistantUpgrades: number;
  agentTargets: (string | null)[];
  agentCarry: number[];
}
