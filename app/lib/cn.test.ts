// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('cn — conditional class name composer', () => {
  it('joins two strings with a space', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('filters out false, null, undefined, and empty strings', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('preserves zero (numbers are kept as strings)', () => {
    expect(cn('a', 0, 'b')).toBe('a 0 b');
  });

  it('flattens nested arrays', () => {
    expect(cn('a', ['b', 'c'], 'd')).toBe('a b c d');
  });

  it('flattens deeply nested arrays', () => {
    expect(cn('a', ['b', ['c', ['d']]])).toBe('a b c d');
  });

  it('supports the common conditional pattern', () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe(
      'base active'
    );
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });

  it('returns empty string for all falsy arguments', () => {
    expect(cn(false, null, undefined, '')).toBe('');
  });
});
