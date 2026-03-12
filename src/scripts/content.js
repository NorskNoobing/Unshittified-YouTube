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
    hideSettingsHelpSection: {
      hiddenAttr: "data-ytx-hidden-settings-help-sidebar",
      prevDisplayAttr: "data-ytx-prev-display-settings-help-sidebar",
      getTargetSections: getSettingsHelpSidebarSections,
      shouldApply: () => true
    }
  };
  const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

  const api = globalThis.browser?.storage ? globalThis.browser : globalThis.chrome;
  const storageArea = api?.storage?.local;

  const currentSettings = { ...DEFAULT_SETTINGS };
  let scheduleQueued = false;
  const YOU_SECTION_DIVIDER_ATTR = "data-ytx-hide-you-section-divider";
  const YOU_SECTION_PREV_STYLE_ATTR = "data-ytx-prev-you-section-style";
  const PROFILE_MENU_REPORT_HISTORY_ATTR = "data-ytx-profile-report-history-entry";

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

  const SETTINGS_HELP_ENDPOINT_MATCHERS = [
    /\/account(?:[/?#]|$)/,
    /\/reporthistory(?:[/?#]|$)/
  ];

  function getExploreSidebarSections() {
    const matchedByEndpoints = getGuideSectionsByEndpointMatchers(EXPLORE_ENDPOINT_MATCHERS, 1);
    if (matchedByEndpoints.length > 0) {
      return matchedByEndpoints;
    }

    return getGuideSectionsByTitles(["Explore"]);
  }

  function getMoreFromYoutubeSidebarSections() {
    const matchedByEndpoints = getGuideSectionsByEndpointMatchers(MORE_FROM_YOUTUBE_ENDPOINT_MATCHERS, 2);
    if (matchedByEndpoints.length > 0) {
      return matchedByEndpoints;
    }

    return getGuideSectionsByTitles(["More from YouTube"]);
  }

  function getSettingsHelpSidebarSections() {
    const groupedSections = getGuideSectionsByEndpointMatchers(SETTINGS_HELP_ENDPOINT_MATCHERS, 2, {
      requireTitle: false
    });

    const standaloneEntries = [
      ...document.querySelectorAll(
        'ytd-guide-renderer a#endpoint[href^="/account"], ytd-guide-renderer a#endpoint[href^="/reporthistory"]'
      )
    ]
      .map((endpoint) =>
        endpoint.closest(
          "ytd-guide-entry-renderer, ytd-guide-collapsible-section-entry-renderer, ytd-guide-downloads-entry-renderer"
        )
      )
      .filter(Boolean);

    return [...new Set([...groupedSections, ...standaloneEntries])];
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

  function clearYouDividerOverrides() {
    for (const node of document.querySelectorAll(`[${YOU_SECTION_DIVIDER_ATTR}="1"]`)) {
      const previousStyle = node.getAttribute(YOU_SECTION_PREV_STYLE_ATTR) || "";
      if (previousStyle) {
        node.setAttribute("style", previousStyle);
      } else {
        node.removeAttribute("style");
      }

      node.removeAttribute(YOU_SECTION_DIVIDER_ATTR);
      node.removeAttribute(YOU_SECTION_PREV_STYLE_ATTR);
    }
  }

  function shouldHideYouSectionDivider() {
    return Boolean(
      currentSettings.hideExploreSection
      && currentSettings.hideMoreFromYoutubeSection
      && currentSettings.hideSidebarFooter
      && currentSettings.hideSettingsHelpSection
    );
  }

  function applyYouSectionDividerState() {
    clearYouDividerOverrides();

    if (!shouldHideYouSectionDivider()) {
      return;
    }

    const youSections = getAllGuideSections().filter((section) =>
      Boolean(section.querySelector('#header #endpoint[href="/feed/you"]'))
    );

    for (const youSection of youSections) {
      youSection.setAttribute(YOU_SECTION_DIVIDER_ATTR, "1");
      youSection.setAttribute(YOU_SECTION_PREV_STYLE_ATTR, youSection.getAttribute("style") || "");
      youSection.style.setProperty("border-bottom", "0", "important");
      youSection.style.setProperty("margin-bottom", "0", "important");
      youSection.style.setProperty("padding-bottom", "0", "important");
    }
  }

  function removeInjectedProfileReportHistoryEntries() {
    for (const node of document.querySelectorAll(`ytd-compact-link-renderer[${PROFILE_MENU_REPORT_HISTORY_ATTR}="1"]`)) {
      node.remove();
    }
  }

  function getReportHistoryIconPath() {
    const sidebarIconPath = document.querySelector('ytd-guide-renderer a#endpoint[href="/reporthistory"] yt-icon path');
    return sidebarIconPath?.getAttribute("d") || "";
  }

  function setProfileMenuIcon(compactLinkRenderer, iconPath) {
    if (!iconPath) {
      return;
    }

    const contentIcon = compactLinkRenderer.querySelector("#content-icon");
    if (!contentIcon) {
      return;
    }

    contentIcon.removeAttribute("hidden");

    let iconHost = contentIcon.querySelector("yt-icon");
    if (!iconHost) {
      iconHost = document.createElement("yt-icon");
      iconHost.className = "style-scope ytd-compact-link-renderer";
      contentIcon.append(iconHost);
    }

    iconHost.removeAttribute("hidden");
    iconHost.innerHTML = `
      <span class="yt-icon-shape style-scope yt-icon ytSpecIconShapeHost">
        <div style="width: 100%; height: 100%; display: block; fill: currentcolor;">
          <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24" focusable="false" aria-hidden="true" style="pointer-events: none; display: inherit; width: 100%; height: 100%;">
            <path d="${iconPath}"></path>
          </svg>
        </div>
      </span>
    `;
  }

  function renderProfileReportHistoryItem(compactLinkRenderer, iconPath) {
    if (!compactLinkRenderer) {
      return;
    }

    const endpoint = compactLinkRenderer.querySelector("a#endpoint");
    if (!endpoint) {
      return;
    }

    endpoint.setAttribute("href", "/reporthistory");
    endpoint.setAttribute("title", "Report history");
    endpoint.removeAttribute("hidden");

    const contentIcon = compactLinkRenderer.querySelector("#content-icon");
    if (contentIcon) {
      contentIcon.removeAttribute("hidden");
    }

    const primaryTextContainer = compactLinkRenderer.querySelector("#primary-text-container");
    if (primaryTextContainer) {
      primaryTextContainer.removeAttribute("hidden");
    }

    const labelNode = compactLinkRenderer.querySelector("#label");
    if (labelNode) {
      labelNode.textContent = "Report history";
      labelNode.removeAttribute("is-empty");
      labelNode.removeAttribute("hidden");
    }

    const subtitleNode = compactLinkRenderer.querySelector("#subtitle");
    if (subtitleNode) {
      subtitleNode.textContent = "";
      subtitleNode.setAttribute("is-empty", "");
    }

    const secondaryTextNode = compactLinkRenderer.querySelector("#secondary-text");
    if (secondaryTextNode) {
      secondaryTextNode.textContent = "";
      secondaryTextNode.setAttribute("hidden", "");
      secondaryTextNode.setAttribute("is-empty", "");
    }

    setProfileMenuIcon(compactLinkRenderer, iconPath);
  }

  function createProfileReportHistoryItem(helpItem, iconPath) {
    const clonedItem = helpItem.cloneNode(true);
    clonedItem.setAttribute(PROFILE_MENU_REPORT_HISTORY_ATTR, "1");
    renderProfileReportHistoryItem(clonedItem, iconPath);

    return clonedItem;
  }

  function findProfileMenuHelpItem(sectionsRoot) {
    const menuItems = sectionsRoot.querySelectorAll(
      "yt-multi-page-menu-section-renderer > #items > ytd-compact-link-renderer"
    );

    for (const item of menuItems) {
      if (!item.isConnected || item.getClientRects().length === 0) {
        continue;
      }

      const endpoint = item.querySelector("a#endpoint");
      if (endpoint?.hasAttribute("href")) {
        continue;
      }

      const labelText = normalizeText(item.querySelector("#label")?.textContent || "");
      if (labelText === "help") {
        return item;
      }
    }

    return null;
  }

  function applyProfileReportHistoryMenuState() {
    if (!currentSettings.addReportHistoryToProfileMenu) {
      removeInjectedProfileReportHistoryEntries();
      return;
    }

    const iconPath = getReportHistoryIconPath();
    const profileMenus = document.querySelectorAll("ytd-popup-container ytd-multi-page-menu-renderer");

    for (const profileMenu of profileMenus) {
      if (!profileMenu.querySelector("#header ytd-active-account-header-renderer")) {
        continue;
      }

      const sectionsRoot = profileMenu.querySelector("#container #sections");
      if (!sectionsRoot) {
        continue;
      }

      const helpItem = findProfileMenuHelpItem(sectionsRoot);
      if (!helpItem) {
        continue;
      }

      const existingReportHistoryItem = sectionsRoot.querySelector(
        `ytd-compact-link-renderer[${PROFILE_MENU_REPORT_HISTORY_ATTR}="1"]`
      );

      if (existingReportHistoryItem) {
        renderProfileReportHistoryItem(existingReportHistoryItem, iconPath);
        if (existingReportHistoryItem.nextElementSibling !== helpItem) {
          helpItem.before(existingReportHistoryItem);
        }
        continue;
      }

      if (
        sectionsRoot.querySelector(
          `ytd-compact-link-renderer:not([${PROFILE_MENU_REPORT_HISTORY_ATTR}="1"]) a#endpoint[href="/reporthistory"]`
        )
      ) {
        continue;
      }

      const reportHistoryItem = createProfileReportHistoryItem(helpItem, iconPath);
      helpItem.before(reportHistoryItem);
    }
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

      try {
        if (!config.shouldApply()) {
          continue;
        }

        for (const section of config.getTargetSections()) {
          hideElementForFeature(section, config);
        }
      } catch (error) {
        console.warn(`Unshittified YouTube: failed to apply ${key}.`, error);
      }
    }

    applyYouSectionDividerState();
    applyProfileReportHistoryMenuState();
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

    for (const key of SETTING_KEYS) {
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
      for (const key of SETTING_KEYS) {
        if (!Object.prototype.hasOwnProperty.call(changes, key)) {
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
