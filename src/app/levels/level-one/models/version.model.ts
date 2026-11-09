export interface AppVersion {
  major: number;
  minor: number;
  patch: number;
}

export function versionForDeployments(deployments: number): AppVersion {
  if (deployments === 0) return { major: 0, minor: 0, patch: 0 };
  return {
    major: 1 + Math.floor((deployments - 1) / 10),
    minor: (deployments - 1) % 10,
    patch: 0
  };
}

export function nextVersion(version: AppVersion): AppVersion {
  if (version.major === 0) return { major: 1, minor: 0, patch: 0 };
  if (version.minor === 9) return { major: version.major + 1, minor: 0, patch: 0 };
  return { major: version.major, minor: version.minor + 1, patch: 0 };
}

export function formatVersion(version: AppVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}
