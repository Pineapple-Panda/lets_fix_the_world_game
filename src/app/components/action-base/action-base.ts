import { Component, input, output } from '@angular/core';
import { storiesPerRelease } from '../../game/game';
import type { Item } from '../../models/item.model';

@Component({
  selector: 'app-action-base',
  template: `
    @let item = selected();
    <section class="panel work-panel" aria-label="Current work">
      <button id="code-button" class="code-button" type="button"
        [disabled]="!item || item.progress >= item.required || canDeploy()"
        (click)="code.emit()">{{ item?.type === 'bug' ? 'Fix bug' : 'Write code' }} <span
        aria-hidden="true">↗</span></button>
      <div class="deploy-bar" [attr.title]="storiesDone() + ' / ' + storiesPerRelease + ' stories completed · +' + deploymentBudget() + ' budget'">
        <button class="deploy-button" type="button" [disabled]="!canDeploy()"
          [attr.aria-label]="'Deploy version ' + releaseVersion() + ': ' + storiesDone() + ' / ' + storiesPerRelease + ' stories completed, reward ' + deploymentBudget() + ' budget'"
          (click)="deploy.emit()">Deploy v{{ releaseVersion() }}
        </button>
      </div>
    </section>
  `
})
export class ActionBaseComponent {
  readonly selected = input.required<Item | undefined>();
  readonly canDeploy = input.required<boolean>();
  readonly storiesDone = input.required<number>();
  readonly releaseVersion = input.required<string>();
  readonly deploymentBudget = input.required<number>();
  readonly code = output<void>();
  readonly deploy = output<void>();
  protected readonly storiesPerRelease = storiesPerRelease;
}
