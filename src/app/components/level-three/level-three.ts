import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  actionsGained, canFight, cardUnlocked, corporation, counterRate, launchedCounters, initiativeBlocker, initiativeFunded, initiativeRate, initiativeUpkeep, openUtopiaPerks, unlockPerk,
  utopiaPerkAvailable
} from '../../game/utopia';
import { attackRules, battleRules, corporations, initiatives, megaCorpName, metrics, playerMoves, utopiaPerks } from '../../game/utopia-content';
import type { UtopiaGame } from '../../models/utopia.model';

/** Level 3: the battle arena on top; the utopia, your development and MegaCorp below. */
@Component({
  selector: 'app-level-three',
  imports: [DecimalPipe],
  templateUrl: './level-three.html'
})
export class LevelThreeComponent {
  readonly state = input.required<UtopiaGame>();
  readonly initiativeStarted = output<string>();
  readonly initiativeStopped = output<string>();
  readonly fightStarted = output<string>();
  readonly moveChosen = output<string>();
  readonly battleClosed = output<void>();
  readonly perkActivated = output<string>();

  protected readonly megaCorpName = megaCorpName;
  protected readonly moves = playerMoves;
  protected readonly battlesEnabled = battleRules.enabled;

  protected readonly view = computed(() => {
    const state = this.state();
    const battle = state.battle;
    const opponent = battle && corporation(battle.corpId);
    return {
      metrics: metrics.map(metric => ({ ...metric, value: state.metrics[metric.id] })),
      initiatives: initiatives.map(initiative => ({
        initiative,
        metricName: metrics.find(metric => metric.id === initiative.metric)?.name ?? initiative.metric,
        rate: Math.round(initiativeRate(state, initiative.id) * 100000) / 100000,
        upkeep: initiativeUpkeep(state, initiative.id),
        running: state.running.includes(initiative.id),
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
      corps: corporations.map(corp => ({
        corp,
        power: state.corpPower[corp.id] ?? 0,
        canFight: canFight(state, corp.id)
      })),
      integrity: state.integrity,
      utopiaOpen: cardUnlocked(state, 'utopia'),
      megacorpOpen: cardUnlocked(state, 'megacorp'),
      utopiaPerkName: unlockPerk('utopia')?.name ?? '',
      megacorpPerkName: unlockPerk('megacorp')?.name ?? '',
      actionsGained: actionsGained(state),
      actionsPerSecond: state.actionRate,
      budgetPerSecond: state.budgetRate,
      activePerks: utopiaPerks.filter(perk => state.perks.includes(perk.id)),
      openPerks: openUtopiaPerks(state).map(perk => ({ perk, unlocked: utopiaPerkAvailable(state, perk) })),
      nextAttack: state.nextAttack,
      attackInterval: attackRules.interval,
      attackLog: state.attackLog,
      battle: battle && opponent ? {
        ...battle,
        corp: opponent,
        playerPercent: battle.playerHp / battleRules.playerHp * 100,
        corpPercent: battle.corpHp / battleRules.corpHp * 100
      } : null
    };
  });

  protected format(value: number): string {
    return Math.round(value).toLocaleString('en-US');
  }
}
