/**
 * @author Chris Wolfe
 * @license Apache-2.0
 */

export function getParentDirectories(pathname) {
  const routes = [];
  const parts = pathname.split("/");
  for (let i = 1; i < parts.length; i++) {
    routes.push(parts.slice(0, i).join("/") + "/");
  }
  return routes;
}

export function makeLinksRelative(doc) {
  const base = doc.location;
  doc.querySelectorAll("*[src]").forEach(element => {
    const relative = makeRelative(element.getAttribute("src"), base);
    element.setAttribute("src", relative);
  });
  doc.querySelectorAll("*[href]").forEach(element => {
    const relative = makeRelative(element.getAttribute("href"), base);
    element.setAttribute("href", relative);
  });
}

export function makeRelative(url, base) {
  const abs = new URL(url, base);
  if (abs.host !== base.host) {
    // Do not modify remote URLs.
    return url;
  }

  const pathParts = abs.pathname.split("/");
  const baseParts = base.pathname.split("/");

  let i = 0;
  for (; i < baseParts.length; i++) {
    if (pathParts[i] !== baseParts[i]) {
      break;
    }
  }

  const dotdots = baseParts.slice(i + 1).map(() => "..");
  return dotdots.concat(pathParts.slice(i)).join("/");
}
