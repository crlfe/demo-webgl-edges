/**
 * @author Chris Wolfe
 * @license Apache-2.0
 */

import { h, insertAll } from "/lib/dom.js";
import { fetchDocument, fetchLinkingData, fetchURLs } from "/lib/fetching.js";
import {
  getParentDirectories,
  makeLinksRelative,
  makeRelative
} from "/lib/pathing.js";
import { addHtmlMetadata } from "/lib/metadata.js";

const SITE = {
  "@type": "WebSite",
  headline: "Edge Detection with WebGL",
  inLanguage: "en",
  copyrightHolder: {
    "@type": "Person",
    name: "Chris Wolfe"
  },
  copyrightYear: 2019
};

setupPage(document).catch(console.error);

async function setupPage(doc) {
  const isRootPage = /^\/(?:index.html)?$/.test(doc.location.pathname);

  const ld = getPageLinkingData(doc);
  ld.isPartOf = SITE;

  // Trailing whitespace outside the body will get merged in.
  // Remove it to avoid unexpected blank lines in the document.
  const last = doc.body.lastChild;
  if (last && last.nodeType === Node.TEXT_NODE) {
    last.textContent = last.textContent.replace(/\s+$/, "\n");
  }

  addHtmlMetadata(doc, ld);

  const cssHref = new URL("layout.css", import.meta.url).pathname;
  insertAll(doc.head, null, [h("link", { rel: "stylesheet", href: cssHref })]);

  if (!doc.querySelector("body > nav")) {
    insertAll(doc.body, doc.body.firstChild, await getSiteMenu(doc, ld));
  }

  if (!doc.querySelector("body > header")) {
    insertAll(doc.body, doc.body.firstChild, await getSiteHeader(doc, ld));
  }

  if (!doc.querySelector("body > footer")) {
    insertAll(doc.body, null, getSiteFooter(doc, ld));
  }

  makeLinksRelative(doc);
}

function getPageLinkingData(doc) {
  const script = doc.head.querySelector('script[type="application/ld+json"]');
  return script ? JSON.parse(script.textContent) : {};
}

async function getSiteMenu(doc, ld) {
  const urls = await fetchURLs(new URL("pages.txt", import.meta.url));
  const docs = await Promise.all(
    urls.map(async url => [url, await fetchLinkingData(url)])
  );

  return h("nav", { class: "menu" }, [
    h("ul", {}, [
      h("li", {}, [h("a", { href: "/" }, "Home")]),
      docs.map(([url, ld]) => {
        const href = makeRelative(url, document.location);
        return h("li", {}, h("a", { href }, ld.headline));
      })
    ])
  ]);
}

function getSiteHeader(doc, ld) {
  return h("header", { class: "page" }, [
    h("h1", {}, ld.headline),
    ld.datePublished &&
      h("p", { class: "date" }, formatLongDate(ld.datePublished))
  ]);
}

function getSiteFooter(doc, ld) {
  return h("footer", { class: "site" }, [
    "Copyright \xA9 2019 Chris Wolfe. " +
      "Licensed under the Apache License, Version 2.0"
  ]);
}

function formatLongDate(source) {
  return new Date(source).toLocaleDateString("en", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}
