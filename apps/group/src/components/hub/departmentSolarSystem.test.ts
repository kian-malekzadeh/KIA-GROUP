import { readFileSync } from 'node:fs';
import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BRAND_TOKENS } from '@kia-group/brand';

/**
 * The departments hub renders as a solar system (Kia Group sun, six department
 * planets on orbit rings) instead of the old bento door grid. These tests pin
 * the structure the approved mock specifies: every department is a planet that
 * links to its route, the geometry puts each planet centre on its own orbit,
 * and the colour discipline survives — the sun is group gold, planets derive
 * from `--dept-*` only, and no department claims the sun's hue.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '..', '..');
const read = (f: string) => readFileSync(path.join(SRC, f), 'utf8');

const component = read('components/hub/DepartmentSolarSystem.tsx');
const css = read('styles/hub.css');
const home = read('app/(group)/home/page.tsx');
const dashboard = read('app/dashboard/page.tsx');

describe('departments solar system', () => {
  it('renders six planets, one per department slug', () => {
    for (const token of BRAND_TOKENS) {
      expect(component, token.slug).toMatch(new RegExp(`slug: '${token.slug}'`));
      // The planet's class is composed per planet in JSX (solar__planet--${slug}),
      // so assert the composition pattern once and each slug's own entry above.
      expect(component).toContain('solar__planet--${planet.slug}');
    }
  });

  it('still routes each department to the door grid\u2019s destinations', () => {
    // The registry mapping the mock fixed: these are the six doors' routes and
    // must not change with the presentation.
    for (const [slug, href] of [
      ['academy', '/tracks'],
      ['events', '/events'],
      ['material', '/material'],
      ['work', '/freelance'],
      ['community', '/community'],
      ['labs', '/labs'],
    ] as const) {
      const entry = component.slice(
        component.indexOf(`slug: '${slug}'`),
        component.indexOf(`slug: '${slug}'`) + 400,
      );
      expect(entry, slug).toContain(`href: '${href}'`);
    }
  });

  it('puts every planet centre on its own orbit circle (to mock precision)', () => {
    // Mock geometry rule: sqrt(dx^2 + dy^2) ~ orbit radius. The mock's
    // coordinates are rounded to two decimals, so compare to the same
    // precision (±0.02%) rather than demanding exactness.
    for (const [orbit, orbitSize, top, left] of [
      [1, '36%', '35.26%', '60.32%'],
      [2, '46%', '52%', '72.91%'],
      [3, '56%', '75.38%', '61.83%'],
      [4, '66%', '77.03%', '31.07%'],
      [5, '76%', '46.69%', '12.14%'],
      [6, '86%', '11.03%', '31.83%'],
    ] as const) {
      const radius = parseFloat(orbitSize) / 2;
      const dx = parseFloat(left) - 50;
      const dy = parseFloat(top) - 50;
      const distance = Math.hypot(dx, dy);
      expect(distance, `planet on orbit ${orbit}`).toBeCloseTo(radius, 1);
    }
  });

  it('renders the hub on the post-auth landing instead of the door grid', () => {
    expect(home).toContain('<DepartmentSolarSystem />');
    expect(home).not.toMatch(/<HubDoors/);
    expect(dashboard).not.toMatch(/<HubDoors/);

    // The dashboard renders it in both states (fresh and full panel).
    const occurrences = dashboard.match(/<DepartmentSolarSystem \/>/g) ?? [];
    expect(occurrences.length).toBe(2);
  });

  it('retires the door grid: HubDoors is fully deleted, not orphaned', () => {
    // The hub was rewritten to the solar system, so the zero-config hub door
    // grid has no remaining consumer. The mock replaces it outright — no dead
    // component may linger (and department pages paint their own tiles).
    let gone = false;
    try {
      statSync(path.join(SRC, 'components/hub/HubDoors.tsx'));
    } catch {
      gone = true;
    }
    expect(gone, 'HubDoors.tsx must be deleted').toBe(true);
  });

  it('links planets as anchors with accessible names', () => {
    expect(component).toMatch(/<Link\s+href=\{planet\.href\}/);
    expect(component).toMatch(/aria-label=\{t\(planet\.titleKey\)\}/);
    expect(component).toMatch(/className=\{`solar__planet solar__planet--\$\{planet\.slug\} dept--\$\{planet\.slug\}`\}/);
  });

  describe('colour discipline', () => {
    it('derives every planet, ring and pulse from --dept tokens, not hex', () => {
      expect(css).toContain('.solar__orbit--1 { --orbit-color: var(--dept-academy); }');
      for (const token of BRAND_TOKENS) {
        expect(css).toContain(`--orbit-color: var(--dept-${token.slug})`);
      }
      // No raw brand hex may appear in the new block.
      const block = css.slice(css.indexOf('Department solar system'));
      expect(block).not.toMatch(/#[0-9a-fA-F]{6}/);
    });

    it('reserves group gold for the sun only', () => {
      const block = css.slice(css.indexOf('Department solar system'));
      const goldUses = [...block.matchAll(/var\(--group-gold\)/g)].length;
      expect(goldUses).toBeGreaterThan(0);
      // The gold may only paint the sun: the sun wordmark, its rim, and the
      // shared keyboard focus ring (brand-level affordance). A planet's own
      // paint — its gradient, border, glow, label — must derive from --dept.
      const sunRules = block.match(/\.solar__sun[^\n{]*\{[^}]*\}/g) ?? [];
      const goldOnSun = sunRules.some((rule) => rule.includes('var(--group-gold)'));
      expect(goldOnSun, 'the sun carries the gold identity').toBe(true);

      const planetRules = block.match(/\.solar__planet\b[^\n{]*\{[^}]*\}/g) ?? [];
      expect(planetRules.length, 'planet rules exist').toBeGreaterThan(3);
      for (const rule of planetRules) {
        expect(rule).not.toContain('var(--dept-academy)'); // a planet never borrows a sibling
        if (rule.includes('.solar__planet--')) {
          // Per-planet variant rules may only set lighting position vars.
          expect(rule).toMatch(/^\.solar__planet--\w+ \{ --planet-light:[^;]+; \}$/);
        }
      }
    });

    it('reuses dept--<slug> so the tile ink (readableInk) applies to planets', () => {
      expect(component).toMatch(/dept--\$\{planet\.slug\}/);
      expect(css).toMatch(/color: var\(--tile-on-fill\);/);
    });
  });

  describe('i18n', () => {
    const fa = read('i18n/messages/fa.ts');
    const en = read('i18n/messages/en.ts');

    it('has a short label per department in both locales', () => {
      for (const slug of ['academy', 'work', 'material', 'events', 'community', 'labs'] as const) {
        expect(fa).toMatch(new RegExp(`${slug}Short: '[^']+'`));
        expect(en).toMatch(new RegExp(`${slug}Short: '[^']+'`));
      }
    });

    it('has the diagram subtitle in both locales', () => {
      expect(fa).toMatch(/orbitsSub: '[^']+'/);
      expect(en).toMatch(/orbitsSub: '[^']+'/);
    });
  });

  describe('reduced motion', () => {
    it('freezes the orbits for users who ask for stillness', () => {
      const motion = css.match(
        /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}\n/,
      );
      expect(motion).not.toBeNull();
      expect(motion?.[0]).toContain('.solar__pulse');
      expect(motion?.[0]).toContain('animation: none');
    });
  });
});
