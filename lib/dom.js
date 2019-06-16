/**
 * Tools for generating and manipulating the browser DOM.
 *
 * @author Chris Wolfe
 * @license Apache-2.0
 */

/**
 * Create an HTML element and its children.
 *
 * Attributes are processed as follows:
 * 1. Name "#text" sets the Element's textContent.
 * 2. Name "#html" sets the Element's innerHTML, with no escaping.
 * 3. Any false, null, and undefined values are skipped.
 * 4. Name "ref" and a function value will be called with the element.
 * 5. Function values are added as event listeners.
 * 6. Otherwise, sets an attribute on the element.
 *
 * Children are added to the new Element using {@link insertAll}.
 *
 * @param {string} type - Tag name of the element to create.
 * @param {object} attrs - Attributes and event handlers.
 * @param {...*} children - Child nodes.
 * @returns {Element} A new element in the current document.
 */
export function h(type, attrs, ...children) {
  const refCallbacks = [];

  const e = document.createElement(type);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "#text") {
      e.textContent = value;
    } else if (key === "#html") {
      e.innerHTML = value;
    } else if (value === false || value === null || value === undefined) {
      // Skip undefined, null, and false attributes.
    } else if (typeof value === "function") {
      if (key === "ref") {
        refCallbacks.push(value);
      } else {
        e.addEventListener(key.replace(/^on/i, ""), value, false);
      }
    } else {
      e.setAttribute(key, String(value));
    }
  }
  if (children) {
    insertAll(e, null, children);
  }
  for (const refCallback of refCallbacks) {
    refCallback(e);
  }
  return e;
}

/**
 * Inserts multiple nodes.
 *
 * Values will be processed as follows:
 * 1. Any false, null, and undefined values are skipped.
 * 2. Nodes will be inserted unchanged.
 * 3. Arrays and other iterable non-strings will be flattened and processed.
 * 4. Strings and other objects will be emitted as text nodes.
 *
 * @param {ParentNode} parent - The target parent node.
 * @param {Node|null} before - Child to insert before, or null to append.
 * @param {...*} values - The values to insert.
 * @returns {void}
 */
export function insertAll(parent, before, ...values) {
  walk(values);

  /**
   * @private
   * Inserts values into the parent, recursing into nested iterables.
   *
   * @param {*} values - An iterable to process.
   */
  function walk(values) {
    for (const value of values) {
      if (value === false || value === null || value === undefined) {
        // Skip falsey values.
      } else if (value instanceof Node) {
        parent.insertBefore(value, before);
      } else if (isIterable(value) && typeof value !== "string") {
        walk(value);
      } else {
        const node = parent.ownerDocument.createTextNode(String(value));
        parent.insertBefore(node, before);
      }
    }
  }
}

/**
 * Tests whether a value is iterable.
 *
 * @param {*} value - The value to test.
 * @returns {boolean} - Whether the value is iterable.
 */
function isIterable(value) {
  return (
    value !== undefined &&
    value !== null &&
    typeof value[Symbol.iterator] === "function"
  );
}
