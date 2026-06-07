// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { filterIndex, type SearchItem } from './search';

const index: SearchItem[] = [
  { title: 'About', url: '/about/', kind: 'page' },
  { title: 'WireTrace', description: 'Serial monitor', url: '/projects/wiretrace/', kind: 'project' },
  { title: 'Live plotter essay', description: 'Reddit thread', url: '/writing/plotter/', kind: 'writing' },
];

describe('filterIndex', () => {
  it('returns the first entries for an empty query', () => {
    expect(filterIndex(index, '', 2)).toHaveLength(2);
  });

  it('matches on the title (case-insensitive)', () => {
    const r = filterIndex(index, 'wiretrace');
    expect(r).toHaveLength(1);
    expect(r[0]?.url).toBe('/projects/wiretrace/');
  });

  it('matches on the description', () => {
    expect(filterIndex(index, 'serial')[0]?.title).toBe('WireTrace');
  });

  it('requires every term to match', () => {
    expect(filterIndex(index, 'live reddit')).toHaveLength(1);
    expect(filterIndex(index, 'live nonexistent')).toHaveLength(0);
  });

  it('caps the number of matches', () => {
    const many: SearchItem[] = Array.from({ length: 20 }, (_, i) => ({
      title: `Item ${i}`,
      url: `/x/${i}/`,
      kind: 'page',
    }));
    expect(filterIndex(many, 'item', 8, 5)).toHaveLength(5);
  });
});
