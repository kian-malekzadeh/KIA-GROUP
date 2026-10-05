/**
 * WCAG 2.x relative-luminance and contrast measurement for brand tokens.
 *
 * The department colours are the brand's published values, so ink choice on a
 * department fill is a measurement, not a preference: each fill wears
 * whichever of the two standard inks (white / the app's near-black) actually
 * reads on it.
 */

/** Linearise an sRGB channel per the WCAG 2.x definition. */
function channel(value: number): number {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Parse `#RGB`/`#RRGGBB` into a WCAG relative-luminance value (0–1). */
export function luminance(hex: string): number {
  const normalized = normalizeHex(hex);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio between two colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The app-shell near-black used as the dark ink on department fills. */
export const DARK_INK = '#0E1626' as const;

export type Ink = '#FFFFFF' | typeof DARK_INK;

/**
 * The more readable of the two inks on a fill, measured — never guessed.
 * Ties (within 0.01) prefer the dark ink so light fills keep their calm look.
 */
export function readableInk(fill: string): Ink {
  const white = contrastRatio(fill, '#FFFFFF');
  const dark = contrastRatio(fill, DARK_INK);
  return white > dark + 0.01 ? '#FFFFFF' : DARK_INK;
}

/** Normalize a hex colour to lowercase `#rrggbb`; throws on anything else. */
export function normalizeHex(hex: string): string {
  let h = hex.trim().toLowerCase();
  if (!h.startsWith('#')) throw new Error(`not a hex colour: ${hex}`);
  h = h.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/.test(h)) throw new Error(`not a 6-digit hex colour: ${hex}`);
  return `#${h}`;
}
