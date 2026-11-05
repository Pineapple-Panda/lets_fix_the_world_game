import type { Perk } from './perk.model';

export interface AvailablePerk {
  perk: Perk;
  available: boolean;
}

export interface PerksView {
  active: Perk[];
  open: AvailablePerk[];
  assistants: number;
  agentLimit: number;
  assignedAgents: number;
  multiAgent: boolean;
  budget: number;
  assistantCost: number;
  performanceCost: number;
  coverageCost: number;
  performanceUpgrades: number;
  assistantOutput: number;
  earlActive: boolean;
  coverage: number;
  coverageUnits: number;
  coverageStep: number;
  autoTesting: boolean;
}
