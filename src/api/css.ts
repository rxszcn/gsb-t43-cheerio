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
    const val =
      typeof value === 'function' ? value.call(el, idx, getCss(el, prop)) : value;

    const styles = parse(el.attribs['style']);
    const normalized = normalizePropName(prop);

    if (val === '') {
      const remaining = styles.filter(
        (decl) => normalizePropName(decl.name) !== normalized,
      );
      if (remaining.length !== styles.length) {
        el.attribs['style'] = stringify(remaining);
      }
    } else if (val != null) {
      const existing = styles.findLast(
        (decl) => normalizePropName(decl.name) === normalized,
      );
      if (existing) {
        // Update the declaration in place, keeping the authored spelling.
        existing.value = val;
      } else {
        styles.push({ name: prop, value: val });
      }
      el.attribs['style'] = stringify(styles);
    }
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
    const normalized = normalizePropName(prop);
    let result: string | undefined;
    for (const decl of styles) {
      if (normalizePropName(decl.name) === normalized) {
        result = decl.value;
      }
    }
    return result;
  }
  if (Array.isArray(prop)) {
    const newStyles: Record<string, string> = {};
    for (const item of prop) {
      const value = getCss(el, item);
      if (value != null) {
        newStyles[item] = value;
      }
    }
    return newStyles;
  }
  const obj: Record<string, string> = {};
  for (const decl of styles) {
    obj[decl.name] = decl.value;
  }
  return obj;
}

/**
 * A single style declaration, keeping the name exactly as authored.
 *
 * @private
 */
interface StyleDeclaration {
  name: string;
  value: string;
}

/**
 * Vendor prefixes that may be written without the leading dash in camelCase
 * form (e.g. `webkitTransform` for `-webkit-transform`).
 *
 * @private
 */
const VENDOR_PREFIX = /^(webkit|moz|ms|o)-/;

/**
 * Normalize a property name so that the camelCase, kebab-case and
 * case-insensitive spellings of the same declaration compare equal. Custom
 * properties (`--*`) are kept as-is: their hyphens are part of the name.
 *
 * @private
 * @param name - The property name to normalize.
 * @returns The normalized property name.
 */
function normalizePropName(name: string): string {
  if (name.startsWith('--')) return name;
  let normalized = name.includes('-')
    ? name.toLowerCase()
    : name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
  if (!normalized.startsWith('-') && VENDOR_PREFIX.test(normalized)) {
    normalized = `-${normalized}`;
  }
  return normalized;
}

/**
 * Stringify `decls` to styles.
 *
 * @private
 * @category CSS
 * @param decls - Declarations to stringify.
 * @returns The serialized styles.
 */
function stringify(decls: StyleDeclaration[]): string {
  return decls.map((decl) => `${decl.name}: ${decl.value};`).join(' ');
}

/**
 * Parse `styles`.
 *
 * @private
 * @category CSS
 * @param styles - Styles to be parsed.
 * @returns The parsed declarations, in document order.
 */
function parse(styles: string): StyleDeclaration[] {
  styles = (styles || '').trim();

  if (!styles) return [];

  const decls: StyleDeclaration[] = [];

  for (const str of styles.split(';')) {
    const n = str.indexOf(':');
    // If there is no :, or if it is the first/last character, add to the previous item's value
    if (n < 1 || n === str.length - 1) {
      const trimmed = str.trimEnd();
      if (trimmed.length > 0 && decls.length > 0) {
        decls[decls.length - 1].value += `;${trimmed}`;
      }
    } else {
      decls.push({
        name: str.slice(0, n).trim(),
        value: str.slice(n + 1).trim(),
      });
    }
  }

  return decls;
}
