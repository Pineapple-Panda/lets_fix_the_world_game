import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, Injector, signal } from '@angular/core';
import { ActionBaseComponent } from './levels/level-one/components/action-base/action-base';
import { BoardComponent } from './levels/level-one/components/board/board';
import { EarlComponent } from './levels/level-one/components/earl/earl';
import { IntroComponent } from './levels/level-one/components/intro/intro';
import { LaunchComponent } from './levels/level-one/components/launch/launch';
import { LevelTwoComponent } from './levels/level-two/components/level-two/level-two';
import { PerksComponent } from './levels/level-one/components/perks/perks';
import { StatsComponent } from './levels/level-one/components/stats/stats';
import { VictoryComponent } from './levels/level-two/components/victory/victory';
import { EventDialogComponent } from './levels/level-two/components/event-dialog/event-dialog';
import { LevelThreeComponent } from './levels/level-three/components/level-three/level-three';
import { DuelDialogComponent } from './levels/level-three/components/duel-dialog/duel-dialog';
import { GameOverComponent } from './levels/level-three/components/game-over/game-over';
import { UtopiaWonComponent } from './levels/level-three/components/utopia-won/utopia-won';
import {
  activateUtopiaPerk, cancelMegacorpEffect, gameSummary, cardBlocker, cardSummary, closeDuel, dismissOutcome, duelBoostCards, duelClickGain, finishDuel, initializeInitiative, newUtopia, playPlayerCard, startDuel, startInitiative, stopInitiative, tickUtopia
} from './levels/level-three/game/utopia';
import type { UtopiaGame } from './levels/level-three/models/utopia.model';
import {
  activatePerk, activePerks, addAssistant, addBug, assignAgent, assistantCount, assistantLimit,
  assistantOutput, autoCoverageRate, clicksPerPress, autoCoverageUpgradeCost, autoDeploy, automate, automationRegressions, boardColumns, bugChance, canDeploy,
  canGenerateBugs, coverageCost, coveragePercent, coverageStep, coverageUpgradeStep, currentAutomationRate, deploy,
  deploymentBudgetReward, improveCoverage, manualCoverageUpgradeCost, newGame, nextAssistantCount, nextAssistantUpgrade, openBugs,
  openPerks, perkUnlocked, releaseTasksDone, releaseTasksOf, selectedWorkItem, selectItem, upgradeAssistants,
  upgradeAutoCoverage, upgradeManualCoverage, work, headStartGame
} from './levels/level-one/game/game';
import {
  activateLaunchedPerk, activateProduct, buyTegridy, canLaunch, dismissVictory, victorySummary, worldFixed, pitch, replayLevelTwo, level2Summary, averageActionsPerSecond, averageBudgetPerSecond, answerEvent, canAcceptEvent, specialEvent, fightLawsuit, settleLawsuit, resolveProtest, startProgram, stopProgram,
  upgradeProduct, endRental, rentSlot, setFocus, launch, skippedLevelTwo, startEpic, tickLaunched } from './levels/level-two/game/launched';
import { newsFeed } from './levels/level-two/game/news';
import { loadGame, loadLaunched, loadUtopia, saveGame, saveKey, saveLaunched, saveUtopia } from './shared/game/storage';
import type { AppView } from './levels/level-one/models/app-view.model';
import type { Game } from './levels/level-one/models/game.model';
import type { Item } from './levels/level-one/models/item.model';
import type { LaunchedGame } from './levels/level-two/models/launched.model';
import type { PerkId } from './levels/level-one/models/perk.model';
import { formatVersion, nextVersion } from './levels/level-one/models/version.model';
import { gameConfig } from './game.config';


@Component({
  selector: 'app-root',
  imports: [ActionBaseComponent, BoardComponent, EarlComponent, IntroComponent, LaunchComponent, LevelTwoComponent, PerksComponent, StatsComponent, VictoryComponent, EventDialogComponent, LevelThreeComponent, DuelDialogComponent, GameOverComponent, UtopiaWonComponent],
  templateUrl: './app.html',
  host: { '(document:keydown)': 'onKeydown($event)' }
})
export class AppComponent {
  private readonly injector = inject(Injector);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private storageBlocked = false;
  private savedSnapshot: string | null = null;

  readonly saveWarning = signal('');
  readonly showIntro = signal(false);
  /** Which levels can be played. */
  protected readonly config = gameConfig;
  /** Level 2 state; null while the player is still in level 1. Must be declared before `game`, which restores it. */
  readonly launched = signal<LaunchedGame | null>(null);
  /** Level 3 state; null while the player is in level 1 or 2. Also restored by `game`. */
  readonly utopia = signal<UtopiaGame | null>(null);
  /** Level 2 news ticker. */
  readonly news = computed(() => {
    const live = this.launched();
    return live ? newsFeed(live) : [];
  });
  /** Level 3 duel: points per push right now, and the boost moves you can use in the dialog. */
  /** The summary of all three levels, while the "utopia achieved" dialog is due. */
  readonly finalSummary = computed(() => {
    const world = this.utopia();
    return world && world.outcome === 'won' && !world.outcomeSeen ? gameSummary(world) : null;
  });
  readonly duelGain = computed(() => {
    const world = this.utopia();
    return world ? duelClickGain(world) : 0;
  });
  readonly duelBoosts = computed(() => {
    const world = this.utopia();
    return world ? duelBoostCards(world).map(card => ({ id: card.id, name: card.name, summary: cardSummary(card), blocker: cardBlocker(world, card.id) })) : [];
  });
  /** The special event waiting for an answer (not while the victory dialog is open). */
  readonly pendingEvent = computed(() => {
    const live = this.launched();
    const event = live && !this.victory() ? specialEvent(live.pendingEvent) : undefined;
    return live && event ? { event, canAccept: canAcceptEvent(live, event.id) } : null;
  });
  /** The "world fixed" summary while its dialog is due. */
  readonly victory = computed(() => {
    const live = this.launched();
    return live && worldFixed(live) && !live.victorySeen ? victorySummary(live) : null;
  });
  readonly game = signal(this.restoreGame());

  readonly view = computed((): AppView => {
    const game = this.game();
    const bugs = openBugs(game);
    const assistants = assistantCount(game);
    const multiAgent = game.activatedPerks.includes('multi-agent');
    const available = openPerks(game).map(perk => ({ perk, available: perkUnlocked(game, perk) }));
    const columns = boardColumns(game);

    return {
      bugs,
      regressions: automationRegressions(game),
      selected: selectedWorkItem(game),
      won: canDeploy(game),
      canLaunch: canLaunch(game),
      multiAgent,
      releaseDone: releaseTasksDone(game),
      releaseTotal: releaseTasksOf(game).length,
      appVersion: formatVersion(game.appVersion),
      releaseVersion: formatVersion(nextVersion(game.appVersion)),
      deploymentBudget: deploymentBudgetReward(game),
      availablePerks: available.filter(entry => entry.available).map(entry => entry.perk),
      stats: {
        actions: game.actions,
        budget: game.budget,
        completed: game.items.filter(item => item.type !== 'bug' && item.done).length,
        total: game.items.filter(item => item.type !== 'bug').length,
        automationRate: Number(currentAutomationRate(game).toFixed(1)),
        openBugs: bugs.length
      },
      perks: {
        active: activePerks(game),
        open: available,
        assistants,
        agentLimit: assistantLimit(game),
        assignedAgents: game.agentTargets.filter(target => target !== null).length,
        multiAgent,
        budget: game.budget,
        assistantCost: nextAssistantCount(game),
        performanceCost: nextAssistantUpgrade(game),
        clicksPerPress: clicksPerPress(game),
        assistantOutput: assistantOutput(game),
        coverage: coveragePercent(game)
      },
      earl: game.activatedPerks.includes('earl') ? {
        budget: game.budget,
        coverage: coveragePercent(game),
        coverageUnits: game.testCoverage,
        coverageCost,
        coverageStep: coverageStep(game),
        testingSkills: game.activatedPerks.includes('testing-skills'),
        manualUpgrades: game.manualCoverageUpgrades,
        manualUpgradeCost: manualCoverageUpgradeCost,
        autoTesting: game.activatedPerks.includes('auto-testing'),
        autoUpgrades: game.autoCoverageUpgrades,
        autoUpgradeCost: autoCoverageUpgradeCost,
        autoRate: autoCoverageRate(game),
        upgradeStep: coverageUpgradeStep
      } : null,
      boards: [{ name: 'Tasks & bugs', columns }]
    };
  });

  constructor() {
    // Keep the notification console scrolled to its newest (bottom) line whenever its content changes.
    // Observes the whole host because the console is re-created when switching between levels.
    afterNextRender(() => {
      const host = this.host.nativeElement as HTMLElement;
      const scrollToBottom = (consoleBody: HTMLElement | null) => {
        if (consoleBody) consoleBody.scrollTop = consoleBody.scrollHeight;
      };
      scrollToBottom(host.querySelector<HTMLElement>('.console-body'));
      const observer = new MutationObserver(mutations => {
        const consoleBody = host.querySelector<HTMLElement>('.console-body');
        if (consoleBody && mutations.some(mutation => mutation.target === consoleBody.parentNode || consoleBody.contains(mutation.target))) {
          scrollToBottom(consoleBody);
        }
      });
      observer.observe(host, { childList: true, subtree: true, characterData: true });
      this.destroyRef.onDestroy(() => observer.disconnect());
    }, { injector: this.injector });

    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || (event.key !== saveKey && event.key !== null) || (event.key !== null && event.newValue === event.oldValue)) return;
      if (window.localStorage.getItem(saveKey) === this.savedSnapshot) return;
      this.storageBlocked = true;
      this.saveWarning.set('Another tab changed the saved game. Saving is paused; reload to use the latest save.');
    };
    window.addEventListener('storage', onStorage);
    this.destroyRef.onDestroy(() => window.removeEventListener('storage', onStorage));

    const timer = setInterval(() => {
      const utopia = this.utopia();
      if (utopia) {
        const next = tickUtopia(utopia);
        this.utopia.set(next);
        this.persistUtopia(next);
        return;
      }
      const launched = this.launched();
      if (launched) {
        const next = tickLaunched(launched, Math.random);
        this.launched.set(next);
        this.persistLaunched(next);
        return;
      }
      if (this.showIntro() || this.view().canLaunch) return;
      if (this.view().won) {
        if (this.game().activatedPerks.includes('auto-deploy')) {
          this.update(game => { autoDeploy(game); });
          return;
        }
        if (this.saveWarning()) this.persistGame(this.game());
        return;
      }
      this.update(game => {
        game.seconds++;
        const chance = bugChance(game);
        if (game.seconds >= 15 && canGenerateBugs(game) && chance > 0 && Math.random() < chance) addBug(game);
        automate(game);
      });
    }, 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== ' ' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && target.isContentEditable) return;
    if (target instanceof Element && target.closest('button, input, select, textarea, [role="button"], [role="checkbox"], [role="radio"], [role="switch"], [role="slider"]')) return;
    event.preventDefault();
  }

  select(item: Item): void {
    this.update(game => { selectItem(game, item.id); });
  }

  code(): void {
    if (!this.view().selected) return;
    this.update(game => {
      // Each performance upgrade adds one extra click.
      // Only the work the item still needs is counted: surplus clicks are lost, not credited as actions.
      work(game, game.selected, clicksPerPress(game));
    });
  }

  activate(id: PerkId): void {
    const active = document.activeElement as HTMLElement | null;
    const fromOpenPerks = !!active?.closest('#open-perks');
    this.update(game => { activatePerk(game, id); });
    if (fromOpenPerks && this.game().activatedPerks.includes(id)) {
      afterNextRender(() => {
        if (this.destroyRef.destroyed || (document.activeElement !== document.body && document.activeElement !== active)) return;
        Array.from((this.host.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[data-tool-id]'))
          .find(icon => icon.dataset['toolId'] === id)?.focus();
      }, { injector: this.injector });
    }
  }

  deploy(): void {
    this.update(game => { deploy(game); });
  }

  addAssistant(): void {
    this.update(game => { addAssistant(game); });
  }

  assignAgent(id: string): void {
    this.update(game => { assignAgent(game, id); });
  }

  upgradeAssistants(): void {
    this.update(game => { upgradeAssistants(game); });
  }

  improveCoverage(): void {
    this.update(game => { improveCoverage(game); });
  }

  upgradeManualCoverage(): void {
    this.update(game => { upgradeManualCoverage(game); });
  }

  upgradeAutoCoverage(): void {
    this.update(game => { upgradeAutoCoverage(game); });
  }

  dismissIntro(): void {
    this.showIntro.set(false);
    this.update(() => {});
    const host: HTMLElement = this.host.nativeElement;
    afterNextRender(() => host.querySelector<HTMLElement>('#board-title')?.focus(), { injector: this.injector });
  }

  reset(): void {
    if (window.confirm('Reset all sprint progress, including saved data?')) {
      try {
        this.savedSnapshot = window.localStorage.getItem(saveKey);
        this.storageBlocked = false;
      } catch {
        this.storageBlocked = true;
        this.saveWarning.set('Unable to access browser storage. Progress is not being saved.');
      }
      this.startFirstLevel();
    }
  }

  /** A new game in the first level the game config enables. */
  private startFirstLevel(): void {
    this.launched.set(null);
    this.utopia.set(null);
    this.update(() => newGame());
    if (gameConfig.levelOneEnabled) return;
    if (gameConfig.levelTwoEnabled) {
      const state = skippedLevelTwo();
      this.launched.set(state);
      this.persistLaunched(state);
    } else if (gameConfig.levelThreeEnabled) {
      const state = newUtopia();
      this.utopia.set(state);
      this.persistUtopia(state);
    }
  }

  activateLaunchedPerk(id: string): void {
    this.updateLaunched(state => activateLaunchedPerk(state, id));
  }

  activateProduct(goal: string): void {
    this.updateLaunched(state => activateProduct(state, goal));
  }

  answerEvent(accept: boolean): void {
    this.updateLaunched(state => answerEvent(state, accept));
  }

  pitch(): void {
    this.updateLaunched(state => pitch(state));
  }

  /** After completing level 2: a new run of level 1 with 10,000 TCA. */
  restartLevelOne(): void {
    if (!gameConfig.levelOneEnabled) return;
    this.launched.set(null);
    this.update(() => headStartGame());
  }

  /** After completing level 2: a new run of level 2 with 10,000,000 TCA and 20,000,000 budget. */
  restartLevelTwo(): void {
    if (!gameConfig.levelTwoEnabled) return;
    const state = replayLevelTwo();
    this.launched.set(state);
    this.persistLaunched(state);
  }

  /** From the victory dialog: leaves level 2 for good; TCA, budget, credibility and the rates per second carry over. */
  startLevelThree(): void {
    const live = this.launched();
    if (!live || !gameConfig.levelThreeEnabled) return;
    const state = newUtopia({
      actions: live.actions, budget: live.budget, integrity: live.integrity,
      actionRate: averageActionsPerSecond(live), budgetRate: averageBudgetPerSecond(live)
    }, [...live.history, level2Summary(live)]);
    this.launched.set(null);
    this.utopia.set(state);
    this.persistUtopia(state);
  }

  activateUtopiaPerk(id: string): void {
    this.updateUtopia(state => activateUtopiaPerk(state, id));
  }

  /** Level 3 lost: start it again with the TCA, budget and rates you have now. */
  retryLevelThree(): void {
    const current = this.utopia();
    if (!current) return;
    const state = newUtopia({ actions: current.actions, budget: current.budget, integrity: 50, actionRate: current.actionRate, budgetRate: current.budgetRate },
      current.history);
    this.utopia.set(state);
    this.persistUtopia(state);
  }

  dismissUtopiaWon(): void {
    this.updateUtopia(state => dismissOutcome(state));
  }

  cancelEffect(index: number): void {
    this.updateUtopia(state => cancelMegacorpEffect(state, index));
  }

  startDuel(): void {
    this.updateUtopia(state => startDuel(state));
  }

  finishDuel(won: boolean): void {
    this.updateUtopia(state => finishDuel(state, won));
  }

  closeDuel(): void {
    this.updateUtopia(state => closeDuel(state));
  }

  playCard(id: string): void {
    this.updateUtopia(state => playPlayerCard(state, id));
  }

  initializeInitiative(id: string): void {
    this.updateUtopia(state => initializeInitiative(state, id));
  }

  startInitiative(id: string): void {
    this.updateUtopia(state => startInitiative(state, id));
  }

  stopInitiative(id: string): void {
    this.updateUtopia(state => stopInitiative(state, id));
  }

  dismissVictory(): void {
    this.updateLaunched(state => dismissVictory(state));
  }

  settleLawsuit(): void {
    this.updateLaunched(state => settleLawsuit(state));
  }

  fightLawsuit(): void {
    this.updateLaunched(state => fightLawsuit(state));
  }

  startProgram(id: string): void {
    this.updateLaunched(state => startProgram(state, id));
  }

  stopProgram(id: string): void {
    this.updateLaunched(state => stopProgram(state, id));
  }

  resolveProtest(id: string): void {
    this.updateLaunched(state => resolveProtest(state, id));
  }

  upgradeProduct(id: string): void {
    this.updateLaunched(state => upgradeProduct(state, id));
  }

  buyTegridy(): void {
    this.updateLaunched(state => buyTegridy(state));
  }

  rentSlot(client: string): void {
    this.updateLaunched(state => rentSlot(state, client));
  }

  endRental(client: string): void {
    this.updateLaunched(state => endRental(state, client));
  }

  setFocus(focus: number): void {
    this.updateLaunched(state => setFocus(state, focus));
  }

  startEpic(id: string): void {
    this.updateLaunched(state => startEpic(state, id));
  }

  /** Applies a level 2 action; a null result means the action was not possible and nothing changes. */
  private updateLaunched(change: (state: LaunchedGame) => LaunchedGame | null): void {
    const current = this.launched();
    if (!current) return;
    const next = change(current);
    if (!next) return;
    this.launched.set(next);
    this.persistLaunched(next);
  }

  /** Leaves level 1 for good: the save is reduced to actions and budget. */
  launchApplication(): void {
    if (!gameConfig.levelTwoEnabled) return;
    const state = launch(this.game());
    if (!state) return;
    this.launched.set(state);
    this.persistLaunched(state);
  }

  private restoreGame(): Game {
    let storage: Storage;
    let snapshot: string | null;
    try {
      storage = window.localStorage;
      snapshot = storage.getItem(saveKey);
    } catch {
      this.storageBlocked = true;
      this.saveWarning.set('Browser storage is unavailable. Progress is not being saved.');
      this.showIntro.set(true);
      return newGame();
    }
    // An incompatible or corrupt save is ignored: the player starts over and the next save replaces it.
    this.savedSnapshot = snapshot;
    // A save in a level the game config disables is not resumed.
    const utopia = gameConfig.levelThreeEnabled ? loadUtopia(storage) : null;
    if (utopia) {
      this.utopia.set(utopia);
      return newGame();
    }
    const launched = gameConfig.levelTwoEnabled ? loadLaunched(storage) : null;
    if (launched) {
      this.launched.set(launched);
      return newGame();
    }
    const savedGame = gameConfig.levelOneEnabled ? loadGame(storage) : null;
    if (savedGame) return savedGame;
    if (gameConfig.levelOneEnabled) {
      this.showIntro.set(true);
    } else if (gameConfig.levelTwoEnabled) {
      this.launched.set(skippedLevelTwo());
    } else if (gameConfig.levelThreeEnabled) {
      this.utopia.set(newUtopia());
    }
    return newGame();
  }

  private persistGame(game: Game): void {
    this.persist(storage => saveGame(storage, game));
  }

  private persistUtopia(state: UtopiaGame): void {
    this.persist(storage => saveUtopia(storage, state));
  }

  private updateUtopia(change: (state: UtopiaGame) => UtopiaGame | null): void {
    const current = this.utopia();
    if (!current) return;
    const next = change(current);
    if (!next) return;
    this.utopia.set(next);
    this.persistUtopia(next);
  }

  private persistLaunched(state: LaunchedGame): void {
    this.persist(storage => saveLaunched(storage, state));
  }

  /** Writes a save unless another tab changed it since our last write. */
  private persist(write: (storage: Storage) => string): void {
    if (this.storageBlocked) return;
    try {
      const storage = window.localStorage;
      if (storage.getItem(saveKey) !== this.savedSnapshot) {
        this.storageBlocked = true;
        this.saveWarning.set('Another tab changed the saved game. Saving is paused; reload to use the latest save.');
        return;
      }
      this.savedSnapshot = write(storage);
      this.saveWarning.set('');
    } catch {
      this.saveWarning.set('Unable to save progress. Check your browser storage settings.');
    }
  }

  private update(change: (game: Game) => Game | void): void {
    const host: HTMLElement = this.host.nativeElement;
    const active = document.activeElement as HTMLElement | null;
    const card = active?.closest<HTMLButtonElement>('.card[data-id]');
    const assignment = active?.closest<HTMLButtonElement>('.assign-button[data-id]');
    const focusedId = card && host.contains(card) ? card.dataset['id'] : undefined;
    const assignmentId = assignment && host.contains(assignment) ? assignment.dataset['id'] : undefined;
    const codeFocused = active?.id === 'code-button' && host.contains(active);
    const currentGame = structuredClone(this.game());
    const game = change(currentGame) || currentGame;
    const bugs = openBugs(game);
    let selected = selectedWorkItem(game);
    if (bugs.length && (!selected || selected.type !== 'bug')) selected = bugs[0];
    game.selected = selected?.id ?? null;
    this.game.set(game);
    this.persistGame(game);

    if (focusedId || assignmentId || codeFocused) {
      afterNextRender(() => {
        if (this.destroyRef.destroyed) return;
        const current = document.activeElement;
        if (current !== document.body && current !== active) return;
        if (current === active && active?.isConnected && !(active as HTMLButtonElement).disabled) return;
        const selector = assignmentId ? '.assign-button[data-id]' : '.card[data-id]';
        const replacement = (assignmentId || focusedId) && Array.from(host.querySelectorAll<HTMLButtonElement>(selector))
          .find(button => button.dataset['id'] === (assignmentId || focusedId) && !button.disabled);
        (replacement || host.querySelector<HTMLElement>('#board-title'))?.focus();
      }, { injector: this.injector });
    }
  }
}
