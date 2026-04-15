// SPDX-License-Identifier: MIT
/**
 * cn — conditional class name composer.
 *
 * Accepts strings, numbers, falsy values (false, null, undefined), or
 * arrays of the same (nested arbitrarily deep). Flattens and joins the
 * truthy string/number values with spaces.
 *
 * No external dependency — matches the subset of `clsx` behavior we
 * actually need.
 *
 * Examples:
 *   cn('base', isActive && 'active')
 *   cn('base', isActive ? ['a', 'b'] : 'c')
 *   cn('base', condition && ['group-hover:opacity-100', 'transition'])
 */

export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | ClassValue[];

export function cn(...args: ClassValue[]): string {
  const out: string[] = [];
  const walk = (value: ClassValue): void => {
    if (!value && value !== 0) return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
    }
  };
  for (const arg of args) walk(arg);
  return out.join(' ');
}
