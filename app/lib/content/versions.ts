// SPDX-License-Identifier: MIT
/**
 * Release versions: `major.minor.patch`, three whole numbers, as the
 * projects' releases are tagged (`v1.2.3`) and as their meta names them.
 */

const VERSION = /^(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})\.(0|[1-9]\d{0,3})$/;

/** Whether `value` is a version written `major.minor.patch`. */
export function isVersion(value: unknown): value is string {
  return typeof value === 'string' && VERSION.test(value);
}

function partsOf(version: string): [number, number, number] {
  const match = VERSION.exec(version);
  if (!match) {
    throw new Error(`${version} is not a version written major.minor.patch`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Negative when `a` is the earlier version, positive when it is the
 * later one, zero when they are the same.
 *
 * @throws Error when either is not a version written major.minor.patch.
 */
export function compareVersions(a: string, b: string): number {
  const [aMajor, aMinor, aPatch] = partsOf(a);
  const [bMajor, bMinor, bPatch] = partsOf(b);
  return aMajor - bMajor || aMinor - bMinor || aPatch - bPatch;
}
