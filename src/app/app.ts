import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, Injector, signal } from '@angular/core';
import { ActionBaseComponent } from './components/action-base/action-base';
import { BoardComponent } from './components/board/board';
import { IntroComponent } from './components/intro/intro';
import { PerksComponent } from './components/perks/perks';
import { StatsComponent } from './components/stats/stats';
import {
  activatePerk, activePerks, addAssistant, addBug, assignAgent, assistantCount, assistantLimit,
  assistantOutput, automate, automationRegressions, boardItems, bugChance, canDeploy, deploymentBudgetReward,
  canGenerateBugs, coverageCost, coveragePercent, coverageStep, currentAutomationRate, deploy, improveCoverage, newGame, nextAssistantCount,
  nextAssistantUpgrade, openBugs, openPerks, perkUnlocked, selectItem, upgradeAssistants, work
} from './game/game';
import { loadGame, saveGame, saveKey } from './game/storage';
import type { AppView } from './models/app-view.model';
import type { Game } from './models/game.model';
import type { Item } from './models/item.model';
import type { PerkId } from './models/perk.model';
import { formatVersion, nextVersion } from './models/version.model';

@Component({
  selector: 'app-root',
  imports: [ActionBaseComponent, BoardComponent, IntroComponent, PerksComponent, StatsComponent],
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
  readonly game = signal(this.restoreGame());

  readonly view = computed((): AppView => {
    const game = this.game();
    const bugs = openBugs(game);
    const selected = game.items.find(item =>
      item.id === game.selected && !item.done && (item.type === 'task' || item.type === 'bug')
    );
    const assistants = assistantCount(game);
    const multiAgent = game.activatedPerks.includes('multi-agent');
    const available = openPerks(game).map(perk => ({ perk, available: perkUnlocked(game, perk) }));
    const visibleItems = boardItems(game);
    const testingEnabled = game.activatedPerks.includes('earl');
    const columns = [
      { name: 'TO DO', items: visibleItems.filter(item => !item.done && !item.inTest && item.progress === 0 && item.id !== game.selected) },
      { name: 'IN PROGRESS', items: visibleItems.filter(item => !item.done && !item.inTest && (item.progress > 0 || item.id === game.selected)) },
      ...(testingEnabled ? [{ name: 'IN TEST', items: visibleItems.filter(item => item.inTest) }] : []),
      { name: 'DONE', items: visibleItems.filter(item => item.done) }
    ];

    return {
      bugs,
      regressions: automationRegressions(game),
      selected,
      won: canDeploy(game),
      multiAgent,
      storiesDone: game.items.filter(item => item.type === 'story' && item.done).length - game.deployments * 5,
      appVersion: formatVersion(game.appVersion),
      releaseVersion: formatVersion(nextVersion(game.appVersion)),
      deploymentBudget: deploymentBudgetReward(game),
      availablePerks: available.filter(entry => entry.available).map(entry => entry.perk),
      waitingForBugs: new Set(game.items.filter(item =>
        item.type === 'story' && !item.done && bugs.length > 0 && item.progress >= item.required &&
        game.items.some(child => child.parent === item.id) &&
        game.items.every(child => child.parent !== item.id || child.done)
      ).map(item => item.id)),
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
        coverageCost,
        performanceUpgrades: game.assistantUpgrades,
        assistantOutput: assistantOutput(game),
        earlActive: testingEnabled,
        coverage: coveragePercent(game),
        coverageUnits: game.testCoverage,
        coverageStep: coverageStep(game),
        autoTesting: game.activatedPerks.includes('auto-testing')
      },
      boards: [
        { name: 'User stories', columns: columns.map(column => ({ ...column, items: column.items.filter(item => item.type === 'story') })) },
        { name: 'Tasks & bugs', columns: columns.map(column => ({ ...column, items: column.items.filter(item => item.type === 'task' || item.type === 'bug') })) }
      ]
    };
  });

  constructor() {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage || (event.key !== saveKey && event.key !== null) || (event.key !== null && event.newValue === event.oldValue)) return;
      if (window.localStorage.getItem(saveKey) === this.savedSnapshot) return;
      this.storageBlocked = true;
      this.saveWarning.set('Another tab changed the saved game. Saving is paused; reload to use the latest save.');
    };
    window.addEventListener('storage', onStorage);
    this.destroyRef.onDestroy(() => window.removeEventListener('storage', onStorage));

    const timer = setInterval(() => {
      if (this.showIntro()) return;
      if (this.view().won) {
        if (this.saveWarning()) this.persistGame(this.game());
        return;
      }
      this.update(game => {
        game.seconds++;
        const chance = bugChance(game);
        if (game.seconds >= 15 && canGenerateBugs(game) && openBugs(game).length < 2 && chance > 0 && Math.random() < chance) addBug(game);
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
    this.update(game => { work(game, game.selected, 1); });
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
      this.update(() => newGame());
    }
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
    try {
      const savedGame = loadGame(storage);
      if (storage.getItem(saveKey) !== snapshot) throw new Error('Saved game changed while loading');
      this.savedSnapshot = snapshot;
      this.showIntro.set(savedGame === null);
      return savedGame ?? newGame();
    } catch {
      this.storageBlocked = true;
      this.showIntro.set(snapshot === null);
      this.saveWarning.set('The saved game could not be loaded or storage is unavailable. Saving is paused to protect existing data.');
      return newGame();
    }
  }

  private persistGame(game: Game): void {
    if (this.storageBlocked) return;
    try {
      const storage = window.localStorage;
      if (storage.getItem(saveKey) !== this.savedSnapshot) {
        this.storageBlocked = true;
        this.saveWarning.set('Another tab changed the saved game. Saving is paused; reload to use the latest save.');
        return;
      }
      this.savedSnapshot = saveGame(storage, game);
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
    let selected = game.items.find(item => item.id === game.selected && !item.done && (item.type === 'task' || item.type === 'bug'));
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
