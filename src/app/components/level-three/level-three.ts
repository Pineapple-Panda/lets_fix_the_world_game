import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  actionsGained, cardUnlocked, corporation, counterRate, initializeBlocker, initiativeBlocker, initiativeFunded, initiativeRate,
  initiativeStage, initiativeUpkeep, launchedCounters, metricRate, openUtopiaPerks, unlockPerk, utopiaPerkAvailable
} from '../../game/utopia';
import { attackRules, corporations, initiatives, megaCorpName, metrics, utopiaPerks } from '../../game/utopia-content';
import type { UtopiaGame } from '../../models/utopia.model';

/** Level 3: you and MegaCorp face each other on top; development, the utopia and MegaCorp's corporations below. */
@Component({
  selector: 'app-level-three',
  imports: [DecimalPipe],
  templateUrl: './level-three.html'
})
export class LevelThreeComponent {
  readonly state = input.required<UtopiaGame>();
  readonly initiativeInitialized = output<string>();
  readonly initiativeStarted = output<string>();
  readonly initiativeStopped = output<string>();
  readonly perkActivated = output<string>();

  protected readonly megaCorpName = megaCorpName;

  protected readonly view = computed(() => {
    const state = this.state();
    const power = corporations.map(corp => state.corpPower[corp.id] ?? 0);
    return {
      metrics: metrics.map(metric => ({ ...metric, value: state.metrics[metric.id], rate: Math.round(metricRate(state, metric.id) * 100000) / 100000 })),
      initiatives: initiatives.map(initiative => ({
        initiative,
        metricName: metrics.find(metric => metric.id === initiative.metric)?.name ?? initiative.metric,
        rate: Math.round(initiativeRate(state, initiative.id) * 100000) / 100000,
        upkeep: initiativeUpkeep(state, initiative.id),
        running: state.running.includes(initiative.id),
        stage: initiativeStage(state, initiative.id),
        buildProgress: (state.building[initiative.id] ?? 0) / initiative.buildTime * 100,
        buildSeconds: state.building[initiative.id] ?? 0,
        initializeBlocker: initializeBlocker(state, initiative.id),
        funded: initiativeFunded(state, initiative.id),
        blocker: state.running.includes(initiative.id) ? null : initiativeBlocker(state, initiative.id)
      })),
      counters: launchedCounters(state).map(counter => ({
        counter,
        corp: corporation(counter.corpId),
        metricName: metrics.find(metric => metric.id === counter.metric)?.name ?? counter.metric,
        rate: Math.round(counterRate(state, counter) * 100000) / 100000,
        power: state.corpPower[counter.corpId] ?? 0
      })),
      corps: corporations.map(corp => ({ corp, power: state.corpPower[corp.id] ?? 0 })),
      /** MegaCorp's strength on the top card: the average power of its corporations. */
      megaPower: Math.round(power.reduce((sum, value) => sum + value, 0) / Math.max(1, power.length)),
      integrity: state.integrity,
      actionsPerSecond: state.actionRate,
      budgetPerSecond: state.budgetRate,
      utopiaOpen: cardUnlocked(state, 'utopia'),
      megacorpOpen: cardUnlocked(state, 'megacorp'),
      utopiaPerkName: unlockPerk('utopia')?.name ?? '',
      megacorpPerkName: unlockPerk('megacorp')?.name ?? '',
      actionsGained: actionsGained(state),
      activePerks: utopiaPerks.filter(perk => state.perks.includes(perk.id)),
      openPerks: openUtopiaPerks(state).map(perk => ({ perk, unlocked: utopiaPerkAvailable(state, perk) })),
      nextAttack: state.nextAttack,
      attackInterval: attackRules.interval,
      attackLog: state.attackLog
    };
  });

  /** 0.012 → "+0.012", -0.02 → "−0.02", 0 → "±0". */
  protected rate(value: number): string {
    return value > 0 ? '+' + value : value < 0 ? '−' + -value : '±0';
  }

  protected format(value: number): string {
    return Math.round(value).toLocaleString('en-US');
  }
}
