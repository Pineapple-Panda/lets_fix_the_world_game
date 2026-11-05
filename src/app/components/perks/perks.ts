import { Component, input, output } from '@angular/core';
import type { Perk, PerkId } from '../../models/perk.model';
import type { PerksView } from '../../models/perks-view.model';

@Component({
  selector: 'app-perks',
  templateUrl: './perks.html'
})
export class PerksComponent {
  readonly view = input.required<PerksView>();
  readonly perkActivated = output<PerkId>();
  readonly assistantAdded = output<void>();
  readonly performanceUpgraded = output<void>();

  tooltip(perk: Perk): string {
    if (perk.id === 'earl') return `${perk.name}: ${perk.description} Test coverage: ${this.view().coverage.toFixed(3)}%.`;
    const rate = perk.kind === 'upgradeable' ? this.view().assistantOutput : perk.rate;
    const output = rate ? ` +${rate} action / sec` : '';
    const assistants = perk.kind === 'upgradeable' ? ` per assistant (${this.view().assistants} active)` : '';
    return `${perk.name}: ${perk.description}${output}${assistants}`;
  }
}
