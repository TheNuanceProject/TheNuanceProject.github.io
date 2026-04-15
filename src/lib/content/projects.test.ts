// SPDX-License-Identifier: MIT
import { describe, it, expect } from 'vitest';
import { allProjects, findProjectBySlug, latestActiveProjects } from './projects';

describe('projects loader', () => {
  it('loads at least one project', () => {
    // WireTrace ships with the site — this test breaks loudly if the
    // project loader or meta validation ever fails silently.
    expect(allProjects.length).toBeGreaterThan(0);
  });

  it('every loaded project has required fields', () => {
    for (const p of allProjects) {
      expect(p.kind).toBe('project');
      expect(p.slug).toBeTruthy();
      expect(p.title).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(p.version).toBeTruthy();
      expect(['Active', 'Maintained', 'Archived']).toContain(p.status);
      expect(Array.isArray(p.platforms)).toBe(true);
      expect(p.platforms.length).toBeGreaterThan(0);
    }
  });

  it('every loaded project has derived date fields', () => {
    for (const p of allProjects) {
      expect(p.displayDate).toBeTruthy();
      expect(p.publishedDate).toBeTruthy();
      expect(p.sortDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('findProjectBySlug returns the matching project', () => {
    expect(allProjects.length).toBeGreaterThan(0);
    const first = allProjects[0]!;
    expect(findProjectBySlug(first.slug)).toBe(first);
  });

  it('findProjectBySlug returns undefined for unknown slug', () => {
    expect(findProjectBySlug('nope-not-a-real-slug')).toBeUndefined();
  });

  it('latestActiveProjects caps at the requested count', () => {
    const result = latestActiveProjects(1);
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it('latestActiveProjects only returns Active projects', () => {
    for (const p of latestActiveProjects(10)) {
      expect(p.status).toBe('Active');
    }
  });
});
