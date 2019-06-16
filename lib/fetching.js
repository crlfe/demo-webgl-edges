/**
 * Tools for fetching resources.
 *
 * @author Chris Wolfe
 * @license Apache-2.0
 */

import { getLinkingData } from "./metadata.js";

async function fetchCheckResponse(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} (${response.statusText})`);
  }
  return response;
}

export async function fetchBlob(url, options) {
  const response = await fetchCheckResponse(url, options);
  return response.blob();
}

export async function fetchText(url, options) {
  const response = await fetchCheckResponse(url, options);
  return response.text();
}

export async function fetchDocument(url, options) {
  options = Object.assign({ destination: "document" }, options);
  const text = await fetchText(url, options);
  return new DOMParser().parseFromString(text, "text/html");
}

export async function fetchLinkingData(url, options) {
  return getLinkingData(await fetchDocument(url, options));
}

export async function fetchJSON(url, options) {
  const text = await fetchText(url, options);
  return JSON.parse(text);
}

export async function fetchLines(url, options) {
  const text = await fetchText(url, options);
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith("#"));
}

export async function fetchURLs(url, options) {
  const lines = await fetchLines(url, options);
  return lines.map(line => new URL(line, url));
}
