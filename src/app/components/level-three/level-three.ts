import { DecimalPipe } from '@angular/common';
import { Component, computed, input, output } from '@angular/core';
import { canFight, corporation } from '../../game/utopia';
import { attackRules, battleRules, corporations, initiatives, megaCorpName, metrics, playerMoves } from '../../game/utopia-content';
import type { UtopiaGame } from '../../models/utopia.model';

/** Level 3: the utopia's bars and initiatives below, MegaCorp on the right, the battle arena on top. */
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
        cooldown: state.cooldowns[initiative.id] ?? 0
      })),
      corps: corporations.map(corp => ({
        corp,
        power: state.corpPower[corp.id] ?? 0,
        canFight: canFight(state, corp.id)
      })),
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
}
