import type { BasePerk } from '../../../shared/models/shared.model.ts';

export type PerkId =
  | 'stack-overflow'
  | 'build-pipeline'
  | 'code-assistant'
  | 'multi-agent'
  | 'ram-upgrade'
  | 'ai-subscription'
  | 'auto-assigner'
  | 'bug-fix-agent'
  | 'ai-max-plan'
  | 'earl'
  | 'testing-skills'
  | 'auto-testing'
  | 'ai-testing-subscription'
  | 'auto-deploy';

export interface Perk extends BasePerk {
  id: PerkId;
  kind: 'simple' | 'upgradeable';
  rate?: number;
}
