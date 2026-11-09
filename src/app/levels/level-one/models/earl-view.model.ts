export interface EarlView {
  budget: number;
  /** Coverage in percent (0–100). */
  coverage: number;
  /** Coverage in units of 1/1000 percentage point (0–100000). */
  coverageUnits: number;
  coverageCost: number;
  /** Coverage units added per manual click. */
  coverageStep: number;
  testingSkills: boolean;
  manualUpgrades: number;
  manualUpgradeCost: number;
  autoTesting: boolean;
  autoUpgrades: number;
  autoUpgradeCost: number;
  /** Coverage units Earl adds per second. */
  autoRate: number;
  /** Coverage units each upgrade adds. */
  upgradeStep: number;
}
