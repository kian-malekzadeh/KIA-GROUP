'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import type { DepartmentSlug } from '@/components/brand/departments';
import { useLanguage } from '@/context/LanguageProvider';

/**
 * The Kia Group departments as a solar system — the hub UI for `/home` and the
 * top of the dashboard (it replaces the old door grid, UX-29/30).
 *
 * KIA GROUP is the sun; each department is a planet on its own orbit ring,
 * swept by a comet pulse. The planets keep the exact routes and translation
 * keys the door grid used (via the `DEPARTMENTS` registry), so navigation,
 * i18n and the rail all behave exactly as before — only the presentation
 * changed, per the approved ecosystem mock.
 *
 * Colour discipline (unchanged): the sun is Kia Group itself — gold rim, gold
 * wordmark, `var(--group-gold)` only on the sun. Every planet, ring and pulse
 * derives from its own `var(--dept-<slug>)` token through the `dept--<slug>`
 * class, so the brand package stays the single source of truth and a recolour
 * can never drift this diagram away from the department pages.
 *
 * Geometry note: each planet centre sits exactly on its orbit circle (verified
 * against the mock: √(dx² + dy²) = orbit radius for all six), so the rings and
 * planets never disagree.
 */
interface Planet {
  /** 1-based orbit index — drives `solar__orbit--N` / `solar__pulse--N` CSS. */
  readonly orbit: 1 | 2 | 3 | 4 | 5 | 6;
  readonly slug: DepartmentSlug;
  readonly href: string;
  /** Full department name — aria-label and hover title. */
  readonly titleKey: string;
  /** Single-word label that fits on the planet. */
  readonly shortKey: string;
  /** Orbit ring diameter, % of the square stage. */
  readonly orbitSize: string;
  /** Planet diameter, % of the square stage. */
  readonly planetSize: string;
  /** Planet centre on the orbit circle, % of the stage. */
  readonly top: string;
  readonly left: string;
}

const PLANETS: readonly Planet[] = [
  {
    orbit: 1,
    slug: 'academy',
    href: '/tracks',
    titleKey: 'dashboard.doors.academyTitle',
    shortKey: 'dashboard.doors.academyShort',
    orbitSize: '36%',
    planetSize: '12%',
    top: '35.26%',
    left: '60.32%',
  },
  {
    orbit: 2,
    slug: 'events',
    href: '/events',
    titleKey: 'dashboard.doors.eventsTitle',
    shortKey: 'dashboard.doors.eventsShort',
    orbitSize: '46%',
    planetSize: '10%',
    top: '52%',
    left: '72.91%',
  },
  {
    orbit: 3,
    slug: 'material',
    href: '/material',
    titleKey: 'dashboard.doors.materialTitle',
    shortKey: 'dashboard.doors.materialShort',
    orbitSize: '56%',
    planetSize: '13%',
    top: '75.38%',
    left: '61.83%',
  },
  {
    orbit: 4,
    slug: 'work',
    href: '/freelance',
    titleKey: 'dashboard.doors.workTitle',
    shortKey: 'dashboard.doors.workShort',
    orbitSize: '66%',
    planetSize: '9%',
    top: '77.03%',
    left: '31.07%',
  },
  {
    orbit: 5,
    slug: 'community',
    href: '/community',
    titleKey: 'dashboard.doors.communityTitle',
    shortKey: 'dashboard.doors.communityShort',
    orbitSize: '76%',
    planetSize: '14%',
    top: '46.69%',
    left: '12.14%',
  },
  {
    orbit: 6,
    slug: 'labs',
    href: '/labs',
    titleKey: 'dashboard.doors.labsTitle',
    shortKey: 'dashboard.doors.labsShort',
    orbitSize: '86%',
    planetSize: '7.5%',
    top: '11.03%',
    left: '31.83%',
  },
] as const;

export function DepartmentSolarSystem({
  showHeading = true,
}: {
  showHeading?: boolean;
}) {
  const { t } = useLanguage();

  // The group name sits last in Persian and first in English, so the single
  // translated phrase is split around `common.brand` instead of storing the
  // halves as separate keys (which cannot express "no lead word" — the
  // translator treats an empty string as missing and falls back to English).
  const heading = t('dashboard.doors.heading');
  const brand = t('common.brand');
  const at = heading.indexOf(brand);

  return (
    <section className="dash-doors dash-doors--solar" aria-label={heading}>
      {showHeading ? (
        <h2 className="dash-doors__heading">
          {at < 0 ? (
            heading
          ) : (
            <>
              {heading.slice(0, at)}
              <span className="dash-doors__brand">{brand}</span>
              {heading.slice(at + brand.length)}
            </>
          )}
        </h2>
      ) : null}

      <p className="solar__sub">{t('dashboard.doors.orbitsSub')}</p>

      <div className="solar__stage">
        {/* The sun — Kia Group itself, rendered as the brand wordmark. */}
        <div className="solar__sun" aria-hidden="true">
          <span className="solar__sun-title">KIA</span>
          <span className="solar__sun-sub">GROUP</span>
        </div>

        {PLANETS.map((planet) => (
          <Fragment key={planet.slug}>
            <div
              className={`solar__orbit solar__orbit--${planet.orbit}`}
              aria-hidden="true"
              style={{ width: planet.orbitSize, height: planet.orbitSize }}
            />
            <div
              className={`solar__pulse solar__pulse--${planet.orbit}`}
              aria-hidden="true"
              style={{ width: planet.orbitSize, height: planet.orbitSize }}
            >
              <span className="solar__pulse-marker">
                <span className="solar__pulse-head" />
                <span className="solar__pulse-tail" />
              </span>
            </div>
            <Link
              href={planet.href}
              className={`solar__planet solar__planet--${planet.slug} dept--${planet.slug}`}
              style={{
                top: planet.top,
                left: planet.left,
                width: planet.planetSize,
                height: planet.planetSize,
              }}
              aria-label={t(planet.titleKey)}
              title={t(planet.titleKey)}
            >
              <span className="solar__label">{t(planet.shortKey)}</span>
            </Link>
          </Fragment>
        ))}
      </div>
    </section>
  );
}
