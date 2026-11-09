/** Which levels can be played. A disabled level is never started, and a saved game in it is not resumed. */
export interface GameConfig {
  levelOneEnabled: boolean;
  levelTwoEnabled: boolean;
  levelThreeEnabled: boolean;
}

export const gameConfig: GameConfig = {
  levelOneEnabled: true,
  levelTwoEnabled: true,
  levelThreeEnabled: false
};
