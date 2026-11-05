# Let's Fix the World

A small idle/clicker game about software development. You are a freelance developer with an ambitious idea:
one platform to help people tackle war, hunger, poverty, corruption and climate change. Work through tasks on a
sprint board, fix the bugs your code (and later your bots) introduce, deploy new versions and spend the budget on
tools that automate the grind.

**Build. Break. Fix. Repeat.**

## How to play

- **Code:** select a task and press *Write code* — every click adds one point of progress. New tasks of the first release unlock as your total coding actions grow.
- **Bugs:** from 100 total coding actions on, bugs start to appear. Each bug belongs to a finished task. Open bugs block all other manual work.
- **Deploy:** once every task and bug of the release is done, deploy the next version. Deploying earns budget, clears the board and starts the next release.
- **Perks:** your total number of actions unlocks perks such as Stack Overflow, Code Assistants, Multi Agent, the Bug-fix Agent and the Earl testing suite.
- **Budget:** spend it on additional assistants, assistant performance upgrades and test coverage (which lowers the bug rate).

Progress is saved in the browser's `localStorage`.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm start      # dev server on http://localhost:4301
npm test       # gameplay checks (tests/game.test.cjs)
npm run build  # production build in dist/lets-fix-the-world-game
```

## Project structure

| Path | Purpose |
|---|---|
| `src/app/game/game.ts` | Framework-independent game rules (pure functions on a `Game` state object) |
| `src/app/game/content.ts`, `initial-backlog.ts` | Release tasks, unlock thresholds and bug templates |
| `src/app/game/storage.ts` | Save/load; incompatible saves are ignored and the game starts over |
| `src/app/models/` | Types for game state, items, perks and view models |
| `src/app/app.ts` | Root component: game loop, persistence and view model |
| `src/app/components/` | Board, cards, stats, actions, perks toolkit and intro dialog |

## Deployment

Every push to `main` runs the tests, builds the app and publishes it to GitHub Pages via
`.github/workflows/deploy.yml`.

## License

See [LICENSE](LICENSE).
