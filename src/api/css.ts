import { domEach } from '../utils.js';
import { isTag, type Element, type AnyNode } from 'domhandler';
import type { Cheerio } from '../cheerio.js';

/**
 * Get the value of a style property for the first element in the set of matched
 * elements.
 *
 * @category CSS
 * @param names - Optionally the names of the properties of interest.
 * @returns A map of all of the style properties.
 * @see {@link https://api.jquery.com/css/}
 */
export function css<T extends AnyNode>(
  this: Cheerio<T>,
  names?: string[],
): Record<string, string> | undefined;
/**
 * Get the value of a style property for the first element in the set of matched
 * elements.
 *
 * @category CSS
 * @param name - The name of the property.
 * @returns The property value for the given name.
 * @see {@link https://api.jquery.com/css/}
 */
export function css<T extends AnyNode>(
  this: Cheerio<T>,
  name: string,
): string | undefined;
/**
 * Set one CSS property for every matched element.
 *
 * @category CSS
 * @param prop - The name of the property.
 * @param val - The new value.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/css/}
 */
export function css<T extends AnyNode>(
  this: Cheerio<T>,
  prop: string,
  val:
    | string
    | ((this: Element, i: number, style: string) => string | undefined),
): Cheerio<T>;
/**
 * Set multiple CSS properties for every matched element.
 *
 * @category CSS
 * @param map - A map of property names and values.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/css/}
 */
export function css<T extends AnyNode>(
  this: Cheerio<T>,
  map: Record<string, string>,
): Cheerio<T>;
/**
 * Set multiple CSS properties for every matched element.
 *
 * @category CSS
 * @param prop - The names of the properties.
 * @param val - The new values.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/css/}
 */
export function css<T extends AnyNode>(
  this: Cheerio<T>,
  prop?: string | string[] | Record<string, string>,
  val?:
    | string
    | ((this: Element, i: number, style: string) => string | undefined),
): Cheerio<T> | Record<string, string> | string | undefined {
  if (
    (prop != null && val != null) ||
    // When `prop` is a "plain" object
    (typeof prop === 'object' && !Array.isArray(prop))
  ) {
    return domEach(this, (el, i) => {
      if (isTag(el)) {
        // `prop` can't be an array here anymore.
        setCss(el, prop as string, val, i);
      }
    });
  }

  if (this.length === 0) {
    return undefined;
  }

  return getCss(this[0], prop as string);
}

/**
 * Set styles of all elements.
 *
 * @private
 * @param el - Element to set style of.
 * @param prop - Name of property.
 * @param value - Value to set property to.
 * @param idx - Optional index within the selection.
 */
function setCss(
  el: Element,
  prop: string | Record<string, string>,
  value:
    | string
    | ((this: Element, i: number, style: string) => string | undefined)
    | undefined,
  idx: number,
) {
  if (typeof prop === 'string') {
    const styles = parse(el.attribs['style']);
    const key = normalizeName(prop);
    const existing = styles.find((decl) => decl.key === key);

    const val =
      typeof value === 'function'
        ? value.call(el, idx, existing?.value as string)
        : value;

    if (val === '') {
      if (existing) styles.splice(styles.indexOf(existing), 1);
    } else if (val != null) {
      if (existing) {
        existing.value = val;
      } else {
        styles.push({ name: prop, value: val, key });
      }
    }

    el.attribs['style'] = stringify(styles);
  } else if (typeof prop === 'object') {
    const keys = Object.keys(prop);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      setCss(el, k, prop[k], i);
    }
  }
}

/**
 * Get the parsed styles of the first element.
 *
 * @private
 * @category CSS
 * @param el - Element to get styles from.
 * @param props - Optionally the names of the properties of interest.
 * @returns The parsed styles.
 */
function getCss(el: AnyNode, props?: string[]): Record<string, string>;
/**
 * Get a property from the parsed styles of the first element.
 *
 * @private
 * @category CSS
 * @param el - Element to get styles from.
 * @param prop - Name of the prop.
 * @returns The value of the property.
 */
function getCss(el: AnyNode, prop: string): string | undefined;
function getCss(
  el: AnyNode,
  prop?: string | string[],
): Record<string, string> | string | undefined {
  if (!el || !isTag(el)) return;

  const styles = parse(el.attribs['style']);
  if (typeof prop === 'string') {
    const key = normalizeName(prop);
    return styles.find((decl) => decl.key === key)?.value;
  }
  if (Array.isArray(prop)) {
    const newStyles: Record<string, string> = {};
    for (const item of prop) {
      const key = normalizeName(item);
      const decl = styles.find((d) => d.key === key);
      if (decl) {
        newStyles[item] = decl.value;
      }
    }
    return newStyles;
  }
  const allStyles: Record<string, string> = {};
  for (const decl of styles) {
    allStyles[decl.name] = decl.value;
  }
  return allStyles;
}

/**
 * A single style declaration, keeping the spelling it was written with.
 *
 * @private
 * @category CSS
 */
interface StyleDecl {
  /** The property name, as written. */
  name: string;
  /** The declaration value. */
  value: string;
  /** The normalized property name, used to match alternate spellings. */
  key: string;
}

/** Vendor prefixes that may be written without a leading dash in camelCase. */
const VENDOR_PREFIXES = ['webkit', 'moz', 'ms', 'o'];

/**
 * Normalize a property name so that the kebab-case, camelCase and uppercase
 * spellings of the same declaration compare equal. Custom properties (`--*`)
 * are case-sensitive and keep their exact name.
 *
 * @private
 * @category CSS
 * @param name - Property name to normalize.
 * @returns The normalized name.
 */
function normalizeName(name: string): string {
  if (name.startsWith('--')) return name;

  const kebab = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

  for (const prefix of VENDOR_PREFIXES) {
    if (kebab.startsWith(`${prefix}-`)) return `-${kebab}`;
  }

  return kebab;
}

/**
 * Stringify `decls` to styles.
 *
 * @private
 * @category CSS
 * @param decls - Declarations to stringify.
 * @returns The serialized styles.
 */
function stringify(decls: StyleDecl[]): string {
  return decls.map((decl) => `${decl.name}: ${decl.value};`).join(' ');
}

/**
 * Parse `styles`.
 *
 * @private
 * @category CSS
 * @param styles - Styles to be parsed.
 * @returns The parsed declarations, in order.
 */
function parse(styles: string): StyleDecl[] {
  styles = (styles || '').trim();

  if (!styles) return [];

  const decls: StyleDecl[] = [];
  const byKey = new Map<string, StyleDecl>();

  let current: StyleDecl | undefined;

  for (const str of styles.split(';')) {
    const n = str.indexOf(':');
    // If there is no :, or if it is the first/last character, add to the previous item's value
    if (n < 1 || n === str.length - 1) {
      const trimmed = str.trimEnd();
      if (trimmed.length > 0 && current !== undefined) {
        current.value += `;${trimmed}`;
      }
    } else {
      const name = str.slice(0, n).trim();
      const value = str.slice(n + 1).trim();
      const key = normalizeName(name);
      const existing = byKey.get(key);
      if (existing) {
        // Last write wins; the declaration keeps its spelling and position.
        existing.value = value;
        current = existing;
      } else {
        current = { name, value, key };
        byKey.set(key, current);
        decls.push(current);
      }
    }
  }

  return decls;
}
