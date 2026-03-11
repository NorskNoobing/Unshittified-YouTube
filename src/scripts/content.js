(function () {
  const DEFAULT_SETTINGS = globalThis.YTX_DEFAULT_SETTINGS;
  if (!DEFAULT_SETTINGS) {
    console.warn("Unshittified YouTube: settings schema is missing in content context.");
    return;
  }

  const SETTINGS_CONFIG = {
    hideMostRelevantSection: {
      hiddenAttr: "data-ytx-hidden-most-relevant",
      prevDisplayAttr: "data-ytx-prev-display-most-relevant",
      getTargetSections: getMostRelevantSections,
      shouldApply: isSubscriptionsPage
    },
    hideShortsSection: {
      hiddenAttr: "data-ytx-hidden-shorts",
      prevDisplayAttr: "data-ytx-prev-display-shorts",
      getTargetSections: getShortsSections,
      shouldApply: isSubscriptionsPage
    },
    hideCountryCode: {
      hiddenAttr: "data-ytx-hidden-country-code",
      prevDisplayAttr: "data-ytx-prev-display-country-code",
      getTargetSections: getCountryCodeElements,
      shouldApply: () => true
    },
    hideVoiceSearchButton: {
      hiddenAttr: "data-ytx-hidden-voice-search",
      prevDisplayAttr: "data-ytx-prev-display-voice-search",
      getTargetSections: getVoiceSearchElements,
      shouldApply: () => true
    },
    hideExploreSection: {
      hiddenAttr: "data-ytx-hidden-explore-sidebar",
      prevDisplayAttr: "data-ytx-prev-display-explore-sidebar",
      getTargetSections: getExploreSidebarSections,
      shouldApply: () => true
    },
    hideMoreFromYoutubeSection: {
      hiddenAttr: "data-ytx-hidden-more-from-youtube-sidebar",
      prevDisplayAttr: "data-ytx-prev-display-more-from-youtube-sidebar",
      getTargetSections: getMoreFromYoutubeSidebarSections,
      shouldApply: () => true
    },
    hideSubscriptionChannels: {
      hiddenAttr: "data-ytx-hidden-subscription-channels",
      prevDisplayAttr: "data-ytx-prev-display-subscription-channels",
      getTargetSections: getSubscriptionsChannelElements,
      shouldApply: () => true
    },
    hideSidebarFooter: {
      hiddenAttr: "data-ytx-hidden-sidebar-footer",
      prevDisplayAttr: "data-ytx-prev-display-sidebar-footer",
      getTargetSections: getSidebarFooterElements,
      shouldApply: () => true
    },
  };

  const api = globalThis.browser?.storage ? globalThis.browser : globalThis.chrome;
  const storageArea = api?.storage?.local;

  const currentSettings = { ...DEFAULT_SETTINGS };
  let scheduleQueued = false;

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

  function isMostRelevantShelf(shelfElement) {
    if (isShortsShelf(shelfElement)) {
      return false;
    }

    const titleText = getTitleText(shelfElement);
    if (titleText.includes("most relevant")) {
      return true;
    }

    // Fallback for non-English UI: standard video shelf with expansion controls, but not Shorts.
    const hasExpansion = shelfElement.hasAttribute("has-expansion-button");
    const hasStandardItems = Boolean(
      shelfElement.querySelector('ytd-rich-item-renderer[is-responsive-grid="STANDARD"]')
    );
    return hasExpansion && hasStandardItems;
  }

  function getMostRelevantSections() {
    const shelves = document.querySelectorAll(
      "ytd-rich-grid-renderer ytd-rich-shelf-renderer[has-expansion-button]"
    );
    return collectSections(shelves, isMostRelevantShelf);
  }

  function isShortsShelf(shelfElement) {
    if (!shelfElement) {
      return false;
    }

    if (shelfElement.matches("ytd-reel-shelf-renderer")) {
      return true;
    }

    if (shelfElement.matches("ytd-rich-shelf-renderer[is-shorts]")) {
      return true;
    }

    const titleText = getTitleText(shelfElement);
    if (titleText.includes("shorts")) {
      return true;
    }

    if (shelfElement.querySelector("ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2")) {
      return true;
    }

    if (shelfElement.querySelector('ytd-rich-item-renderer[is-slim-media] a[href^="/shorts/"]')) {
      return true;
    }

    if (shelfElement.querySelector("ytd-reel-item-renderer, ytd-reel-video-renderer")) {
      return true;
    }

    return false;
  }

  function getShortsSections() {
    const shelves = document.querySelectorAll(
      "ytd-rich-grid-renderer ytd-rich-shelf-renderer[is-shorts], ytd-rich-grid-renderer ytd-reel-shelf-renderer, ytd-rich-grid-renderer ytd-rich-shelf-renderer"
    );
    return collectSections(shelves, isShortsShelf);
  }

  function getCountryCodeElements() {
    return [
      ...document.querySelectorAll(
        "ytd-topbar-logo-renderer #country-code, ytd-masthead #country-code"
      )
    ];
  }

  function getVoiceSearchElements() {
    return [
      ...document.querySelectorAll(
        "ytd-masthead #voice-search-button"
      )
    ];
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

  function getGuideSectionsByEndpointMatchers(matchers, minMatches = 1) {
    return getAllGuideSections().filter((section) => {
      if (!getGuideSectionTitle(section)) {
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

  const EXPLORE_ENDPOINT_MATCHERS = [
    /\/channel\/uc-9-kytw8zkzndhqj6fgpwq(?:[/?#]|$)/,
    /\/feed\/storefront(?:[/?#]|$)/,
    /\/gaming(?:[/?#]|$)/,
    /\/feed\/trending(?:[/?#]|$)/
  ];

  const MORE_FROM_YOUTUBE_ENDPOINT_MATCHERS = [
    /(?:^|\.)youtube\.com\/premium(?:[/?#]|$)/,
    /^studio\.youtube\.com\//,
    /^music\.youtube\.com\//,
    /(?:^|\.)youtubekids\.com\//
  ];

  function getExploreSidebarSections() {
    const matchedByEndpoints = getGuideSectionsByEndpointMatchers(EXPLORE_ENDPOINT_MATCHERS, 1);
    if (matchedByEndpoints.length > 0) {
      return matchedByEndpoints;
    }

    return getGuideSectionsByTitles(["Explore"]);
  }

  function getMoreFromYoutubeSidebarSections() {
    const matchedByEndpoints = getGuideSectionsByEndpointMatchers(MORE_FROM_YOUTUBE_ENDPOINT_MATCHERS, 1);
    if (matchedByEndpoints.length > 0) {
      return matchedByEndpoints;
    }

    return getGuideSectionsByTitles(["More from YouTube"]);
  }

  function getSidebarFooterElements() {
    return [
      ...document.querySelectorAll("ytd-guide-renderer #footer")
    ];
  }

  function getSubscriptionsChannelElements() {
    const elementsToHide = [];
    const sections = document.querySelectorAll("ytd-guide-section-renderer");

    for (const section of sections) {
      const itemsContainer = section.querySelector("#items");
      if (!itemsContainer) {
        continue;
      }

      const subscriptionsEntry = itemsContainer.querySelector(":scope > ytd-guide-collapsible-section-entry-renderer");
      if (!subscriptionsEntry) {
        continue;
      }

      const headerEndpoint = subscriptionsEntry.querySelector('#header #endpoint[href="/feed/subscriptions"]');
      if (!headerEndpoint) {
        continue;
      }

      const sectionChildren = itemsContainer.querySelectorAll(":scope > *");
      for (const child of sectionChildren) {
        if (child !== subscriptionsEntry) {
          elementsToHide.push(child);
        }
      }
    }

    return elementsToHide;
  }

  function hideElementForFeature(element, config) {
    if (element.getAttribute(config.hiddenAttr) === "1") {
      return;
    }

    element.setAttribute(config.hiddenAttr, "1");
    element.setAttribute(config.prevDisplayAttr, element.style.display || "");
    element.style.display = "none";
  }

  function unhideFeature(config) {
    const hiddenNodes = document.querySelectorAll(`[${config.hiddenAttr}="1"]`);
    for (const node of hiddenNodes) {
      const previousDisplay = node.getAttribute(config.prevDisplayAttr) || "";
      node.style.display = previousDisplay;
      node.removeAttribute(config.hiddenAttr);
      node.removeAttribute(config.prevDisplayAttr);
    }
  }

  function applyCurrentState() {
    for (const config of Object.values(SETTINGS_CONFIG)) {
      unhideFeature(config);
    }

    for (const [key, config] of Object.entries(SETTINGS_CONFIG)) {
      if (!currentSettings[key]) {
        continue;
      }

      if (!config.shouldApply()) {
        continue;
      }

      for (const section of config.getTargetSections()) {
        hideElementForFeature(section, config);
      }
    }
  }

  function scheduleApply() {
    if (scheduleQueued) {
      return;
    }

    scheduleQueued = true;
    requestAnimationFrame(() => {
      scheduleQueued = false;
      applyCurrentState();
    });
  }

  function getFromStorage(defaults) {
    if (!storageArea) {
      return Promise.resolve({ ...defaults });
    }

    try {
      const result = storageArea.get(defaults);
      if (result && typeof result.then === "function") {
        return result;
      }
    } catch (error) {
      // Fall back to callback-style API.
    }

    return new Promise((resolve) => {
      storageArea.get(defaults, resolve);
    });
  }

  async function getSettings(defaults) {
    try {
      return await getFromStorage(defaults);
    } catch (error) {
      return { ...defaults };
    }
  }

  async function loadSettings() {
    const settings = await getSettings(DEFAULT_SETTINGS);

    for (const [key] of Object.entries(SETTINGS_CONFIG)) {
      const value = settings[key];
      currentSettings[key] = value === undefined ? Boolean(DEFAULT_SETTINGS[key]) : Boolean(value);
    }

    scheduleApply();
  }

  function initStorageListener() {
    if (!api?.storage?.onChanged) {
      return;
    }

    api.storage.onChanged.addListener((changes) => {
      let hasRelevantChange = false;
      for (const [key] of Object.entries(SETTINGS_CONFIG)) {
        if (!changes[key]) {
          continue;
        }

        const nextValue = changes[key].newValue;
        currentSettings[key] = nextValue === undefined ? Boolean(DEFAULT_SETTINGS[key]) : Boolean(nextValue);
        hasRelevantChange = true;
      }

      if (hasRelevantChange) {
        scheduleApply();
      }
    });
  }

  function initPageObservers() {
    const observer = new MutationObserver(() => {
      scheduleApply();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("yt-navigate-finish", scheduleApply, { passive: true });
    window.addEventListener("popstate", scheduleApply, { passive: true });
  }

  async function init() {
    initStorageListener();
    initPageObservers();
    await loadSettings();
    scheduleApply();
  }

  init();
})();