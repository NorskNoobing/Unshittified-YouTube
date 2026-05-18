(function () {
  function isSubscriptionsPage() {
    return location.pathname === "/feed/subscriptions";
  }

  function normalizeText(value) {
    return (value || "").replace(/\s+/g, " ").trim().toLowerCase();
  }

  function getTitleText(shelfElement) {
    const titleNode = shelfElement.querySelector("#title");
    return normalizeText(titleNode?.textContent || "");
  }

  function collectSections(elements, matcher) {
    const sectionSet = new Set();

    for (const element of elements) {
      if (!matcher(element)) {
        continue;
      }

      const section = element.closest("ytd-rich-section-renderer, ytd-item-section-renderer");
      sectionSet.add(section || element);
    }

    return [...sectionSet];
  }

  function getGuideSectionTitle(sectionElement) {
    const titleNode = sectionElement.querySelector("#guide-section-title");
    return normalizeText(titleNode?.textContent || "");
  }

  function getAllGuideSections() {
    return [...document.querySelectorAll("ytd-guide-renderer ytd-guide-section-renderer")];
  }

  function getGuideSectionsByTitles(titleList) {
    const wantedTitles = new Set(titleList.map((title) => normalizeText(title)));

    return getAllGuideSections().filter((section) => {
      const sectionTitle = getGuideSectionTitle(section);
      return wantedTitles.has(sectionTitle);
    });
  }

  function normalizeGuideEndpointHref(rawHref) {
    if (!rawHref) {
      return "";
    }

    try {
      const parsed = new URL(rawHref, location.origin);
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname.toLowerCase();
      const search = parsed.search.toLowerCase();
      return `${host}${path}${search}`;
    } catch (error) {
      return String(rawHref).toLowerCase();
    }
  }

  function getGuideSectionEndpointHrefs(sectionElement) {
    return [
      ...sectionElement.querySelectorAll('#items a#endpoint[href]')
    ].map((endpoint) => normalizeGuideEndpointHref(endpoint.getAttribute("href")));
  }

  function getGuideSectionsByEndpointMatchers(matchers, minMatches = 1, options = {}) {
    const requireTitle = options.requireTitle ?? true;

    return getAllGuideSections().filter((section) => {
      if (requireTitle && !getGuideSectionTitle(section)) {
        return false;
      }

      const hrefs = getGuideSectionEndpointHrefs(section);
      if (hrefs.length === 0) {
        return false;
      }

      let matches = 0;
      for (const matcher of matchers) {
        if (hrefs.some((href) => matcher.test(href))) {
          matches += 1;
        }
      }

      return matches >= minMatches;
    });
  }

  globalThis.YTX_YOUTUBE_DOM = {
    collectSections,
    getAllGuideSections,
    getGuideSectionsByEndpointMatchers,
    getGuideSectionsByTitles,
    getTitleText,
    isSubscriptionsPage,
    normalizeText
  };
})();
