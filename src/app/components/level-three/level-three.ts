import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import {
  averageActionsPerSecond, averageBudgetPerSecond, canFight, canRunInitiative, corporation, initiativeGain, openUtopiaPerks,
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
  readonly initiativeRun = output<string>();
  readonly fightStarted = output<string>();
  readonly moveChosen = output<string>();
  readonly battleClosed = output<void>();
  readonly perkActivated = output<string>();

  protected readonly megaCorpName = megaCorpName;
  protected readonly moves = playerMoves;

  protected readonly view = computed(() => {
    const state = this.state();
    const battle = state.battle;
    const opponent = battle && corporation(battle.corpId);
    return {
      metrics: metrics.map(metric => ({ ...metric, value: state.metrics[metric.id] })),
      initiatives: initiatives.map(initiative => ({
        initiative,
        metricName: metrics.find(metric => metric.id === initiative.metric)?.name ?? initiative.metric,
        gain: initiativeGain(state, initiative.id),
        cooldown: state.cooldowns[initiative.id] ?? 0,
        canRun: canRunInitiative(state, initiative.id)
      })),
      corps: corporations.map(corp => ({
        corp,
        power: state.corpPower[corp.id] ?? 0,
        canFight: canFight(state, corp.id)
      })),
      integrity: state.integrity,
      actionsPerSecond: averageActionsPerSecond(),
      budgetPerSecond: averageBudgetPerSecond(),
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
