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
  /** Clicks triggered by one press of Write code / Fix bug. */
  clicksPerPress: number;
  assistantOutput: number;
  coverage: number;
}
