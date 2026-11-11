# Let's Fix the World

A small idle/clicker game in three levels. You are a freelance developer with an ambitious idea: one platform to
help people tackle war, hunger, poverty, corruption and climate change. First you build it, then you use it to fix
the world, and then the corporations that liked the world the way it was fight back.

**Build. Break. Fix. Repeat.**

Play it on GitHub Pages: <https://pineapple-panda.github.io/lets_fix_the_world_game/>

## How to play

### Level 1 · Building the platform

- **Code:** select a task on the sprint board and press *Write code*. Every click adds progress; new tasks unlock as
  your total coding actions (TCA) grow.
- **Bugs:** from 100 TCA on, bugs appear. Open bugs block all other manual work.
- **Deploy:** once every task and bug of a release is done, deploy the next version. Deploying earns budget and starts
  the next release.
- **Perks:** TCA unlock perks such as Stack Overflow, Code Assistants, Multi-Agent Mode, the AI Max Plan and the Earl
  test suite. Budget buys more assistants, upgrades and test coverage.
- **Launch:** at 100% test coverage the platform goes live and level 2 begins.

### Level 2 · Fixing the world

- TCA and budget now grow on their own. The focus slider trades actions for budget; servers, clients and investor
  pitches speed things up.
- **Epics** run on your servers and complete world goals. Finished goals release three applications (Green World,
  Fair Share, Peace & Integrity) whose **programs** push the five world problems towards 100%.
- **Integrity** matters: shady clients and programs pay well but cost integrity, and too much success gets you **sued**
  by Mississippi Corp, Bananas Inc. and EdisonX. Settle, or fight in court with lawyers. A solved application can no
  longer be sued.
- Special events (a donation, a leak, a drought) ask for a decision.
- Level 2 is won when all five world problems are solved.

### Level 3 · Building utopia

- Keep employment, housing and food high with **initiatives**: build them, then run them for an upkeep.
- **MegaCorp** (Bananas Inc., Mississippi Corp and EdisonX) runs counter initiatives, plays damage cards and starts
  duels. Play your own action cards and win duels to bring its corporations' power down.
- Win when every utopia bar reaches 100%; lose when all of them drop to 0%. The win screen sums up all three levels.

Progress is saved in the browser's `localStorage` (one save, key `sprint-game`). Saves that no longer match the game
are ignored and the game starts over.

## Configuration

[`src/app/game.config.ts`](src/app/game.config.ts) switches levels on and off (`levelOneEnabled`, `levelTwoEnabled`,
`levelThreeEnabled`). A disabled level is never started, the dialogs leading to it hide their buttons, and a save in it
is not resumed.

Balance and content live in plain data files:

| What | Where |
|---|---|
| Perks of all three levels | [`src/app/shared/content/perks.ts`](src/app/shared/content/perks.ts) |
| Level 1 tasks, unlock thresholds and bugs | `src/app/levels/level-one/game/content.ts`, `initial-backlog.ts` |
| Level 2 epics, products, programs, clients, lawsuits and events | `src/app/levels/level-two/game/launched-content.ts` |
| Level 3 start values, bars, corporations, cards and initiatives | `src/app/levels/level-three/game/utopia-content.ts` |

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm start      # dev server on http://localhost:4301
npm test       # gameplay checks (tests/game.test.cjs)
npm run build  # production build in dist/lets-fix-the-world-game
```

The game is built with Angular 22 (standalone components, signals). The game rules are plain TypeScript functions
without Angular, so `npm test` runs them directly with Node's type stripping, without a test framework.

## Project structure

```
src/app/
├── app.ts / app.html        Root component: game loop, saving, level switches
├── game.config.ts           Which levels are enabled
├── levels/
│   ├── level-one/           Sprint board, perks, Earl, intro and launch dialogs
│   ├── level-two/           World problems, products, programs, lawsuits, events, victory dialog
│   └── level-three/         Utopia bars, initiatives, MegaCorp, action cards, duels
└── shared/
    ├── components/          Modal dialog base, facts list, GitHub link
    ├── content/             Perks of all levels
    ├── game/                Saving and loading, smooth value updates
    └── models/              Base types the level models extend (perks, programs, facts)
```

Every level folder has the same layout:

| Folder | Purpose |
|---|---|
| `game/` | Rules as pure functions on the level's state object (`game.ts`, `launched.ts`, `utopia.ts`) and its content |
| `models/` | Types for the level's state and content |
| `components/` | The level's Angular components |

The game logic ticks once per second. Between ticks, the shown numbers and bars glide towards the new values
(`shared/game/smoothing.ts`, `smoother.ts`); player actions show at once.

## Deployment

- Pushes to other branches and pull requests run the tests and the build (`.github/workflows/ci.yml`).
- Every push to `main` runs the tests, builds the app and publishes it to GitHub Pages
  (`.github/workflows/deploy.yml`).

## License

MIT, see [LICENSE](LICENSE).
