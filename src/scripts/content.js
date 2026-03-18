(function () {
  const SETTINGS = globalThis.YTX_SETTINGS;
  const DEFAULT_SETTINGS = globalThis.YTX_DEFAULT_SETTINGS;
  if (!Array.isArray(SETTINGS) || !DEFAULT_SETTINGS) {
    console.warn("Unshittified YouTube: settings schema is missing in content context.");
    return;
  }

  const SETTINGS_BY_KEY = Object.freeze(
    Object.fromEntries(SETTINGS.map((setting) => [setting.key, setting]))
  );

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
    },
    hideJoinButton: {
      hiddenAttr: "data-ytx-hidden-join-button",
      prevDisplayAttr: "data-ytx-prev-display-join-button",
      getTargetSections: getJoinButtonElements,
      shouldApply: isWatchPage
    }
  };
  const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);
  const WATCH_ACTIONS = Object.freeze([
    {
      key: "shareButtonMode",
      label: "Share",
      match: (labelText, buttonText) => labelText === "share" || buttonText === "share"
    },
    {
      key: "saveButtonMode",
      label: "Save",
      match: (labelText, buttonText) =>
        labelText === "save to playlist" || labelText === "save" || buttonText === "save"
    },
    {
      key: "thanksButtonMode",
      label: "Thanks",
      match: (labelText, buttonText) => labelText === "thanks" || buttonText === "thanks"
    }
  ]);
  const WATCH_ACTION_PLACEHOLDER_ATTR = "data-ytx-watch-action-placeholder";
  const WATCH_ACTION_KEY_ATTR = "data-ytx-watch-action-key";
  const WATCH_ACTION_HIDDEN_ATTR = "data-ytx-watch-action-hidden";
  const WATCH_ACTION_PREV_DISPLAY_ATTR = "data-ytx-watch-action-prev-display";
  const WATCH_ACTION_MENU_ITEM_ATTR = "data-ytx-watch-action-menu-item";
  const REMOVE_ADS_HIDDEN_ATTR = "data-ytx-watch-remove-ads-hidden";
  const REMOVE_ADS_PREV_DISPLAY_ATTR = "data-ytx-watch-remove-ads-prev-display";

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

  function isWatchPage() {
    return location.pathname === "/watch";
  }

  function normalizeSettingValue(key, value) {
    const setting = SETTINGS_BY_KEY[key];
    if (!setting) {
      return value;
    }

    if (setting.type === "select") {
      return setting.options?.includes(value) ? value : setting.defaultValue;
    }

    return value === undefined ? Boolean(setting.defaultValue) : Boolean(value);
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

  function getJoinButtonElements() {
    return [
      ...document.querySelectorAll("ytd-watch-metadata ytd-video-owner-renderer #sponsor-button")
    ];
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

  function getWatchMenuRenderer() {
    return document.querySelector("ytd-watch-metadata #menu > ytd-menu-renderer");
  }

  function getWatchActionContainers(menuRenderer) {
    if (!menuRenderer) {
      return [];
    }

    return [
      ...menuRenderer.querySelectorAll(":scope > #top-level-buttons-computed > *, :scope > #flexible-item-buttons > *")
    ];
  }

  function getActionButtonLabel(container) {
    const button = container.querySelector("button");
    const ariaLabel = normalizeText(button?.getAttribute("aria-label") || "");
    const buttonText = normalizeText(
      button?.querySelector(".yt-spec-button-shape-next__button-text-content")?.textContent
      || button?.textContent
      || ""
    );

    return { button, ariaLabel, buttonText };
  }

  function findWatchActionContainer(menuRenderer, action) {
    const containers = getWatchActionContainers(menuRenderer);

    for (const container of containers) {
      const { ariaLabel, buttonText } = getActionButtonLabel(container);
      if (action.match(ariaLabel, buttonText)) {
        return container;
      }
    }

    return document.querySelector(`[${WATCH_ACTION_KEY_ATTR}="${action.key}"]`);
  }

  function ensureWatchActionPlaceholder(container, actionKey) {
    if (!container?.isConnected) {
      return null;
    }

    container.setAttribute(WATCH_ACTION_KEY_ATTR, actionKey);

    const previousElement = container.previousElementSibling;
    if (previousElement?.getAttribute(WATCH_ACTION_PLACEHOLDER_ATTR) === actionKey) {
      return previousElement;
    }

    const existingPlaceholder = document.querySelector(
      `[${WATCH_ACTION_PLACEHOLDER_ATTR}="${actionKey}"]`
    );
    if (existingPlaceholder) {
      return existingPlaceholder;
    }

    const placeholder = document.createElement("span");
    placeholder.hidden = true;
    placeholder.setAttribute(WATCH_ACTION_PLACEHOLDER_ATTR, actionKey);
    container.before(placeholder);
    return placeholder;
  }

  function restoreWatchActionVisibility() {
    for (const node of document.querySelectorAll(`[${WATCH_ACTION_HIDDEN_ATTR}="1"]`)) {
      const previousDisplay = node.getAttribute(WATCH_ACTION_PREV_DISPLAY_ATTR) || "";
      node.style.display = previousDisplay;
      node.removeAttribute(WATCH_ACTION_HIDDEN_ATTR);
      node.removeAttribute(WATCH_ACTION_PREV_DISPLAY_ATTR);
    }
  }

  function unhideWatchActionContainer(container) {
    if (!container || container.getAttribute(WATCH_ACTION_HIDDEN_ATTR) !== "1") {
      return;
    }

    const previousDisplay = container.getAttribute(WATCH_ACTION_PREV_DISPLAY_ATTR) || "";
    container.style.display = previousDisplay;
    container.removeAttribute(WATCH_ACTION_HIDDEN_ATTR);
    container.removeAttribute(WATCH_ACTION_PREV_DISPLAY_ATTR);
  }

  function hideWatchActionContainer(container) {
    if (!container || container.getAttribute(WATCH_ACTION_HIDDEN_ATTR) === "1") {
      return;
    }

    container.setAttribute(WATCH_ACTION_HIDDEN_ATTR, "1");
    container.setAttribute(WATCH_ACTION_PREV_DISPLAY_ATTR, container.style.display || "");
    container.style.display = "none";
  }

  function restoreWatchActionPlacement() {
    restoreWatchActionVisibility();

    for (const placeholder of document.querySelectorAll(`[${WATCH_ACTION_PLACEHOLDER_ATTR}]`)) {
      const actionKey = placeholder.getAttribute(WATCH_ACTION_PLACEHOLDER_ATTR);
      if (!actionKey) {
        continue;
      }

      const actionContainer = document.querySelector(`[${WATCH_ACTION_KEY_ATTR}="${actionKey}"]`);
      if (!actionContainer || !actionContainer.isConnected) {
        continue;
      }

      if (actionContainer.previousElementSibling !== placeholder) {
        placeholder.after(actionContainer);
      }
    }
  }

  function restoreWatchActionToPlaceholder(actionKey, actionContainer) {
    const placeholder = getWatchActionPlaceholder(actionKey);
    if (!placeholder || !actionContainer || actionContainer.previousElementSibling === placeholder) {
      return;
    }

    placeholder.after(actionContainer);
  }

  function getPopupItemText(item) {
    return normalizeText(
      item.querySelector("yt-formatted-string")?.textContent
      || item.querySelector(".yt-list-item-view-model__title")?.textContent
      || item.querySelector("button")?.textContent
      || ""
    );
  }

  function restoreRemoveAdsMenuItems() {
    for (const item of document.querySelectorAll(`[${REMOVE_ADS_HIDDEN_ATTR}="1"]`)) {
      const previousDisplay = item.getAttribute(REMOVE_ADS_PREV_DISPLAY_ATTR) || "";
      item.style.display = previousDisplay;
      item.removeAttribute(REMOVE_ADS_HIDDEN_ATTR);
      item.removeAttribute(REMOVE_ADS_PREV_DISPLAY_ATTR);
    }
  }

  function getVisibleWatchActionPopups() {
    return [
      ...document.querySelectorAll("ytd-popup-container ytd-menu-popup-renderer")
    ].filter(
      (popup) =>
        popup.isConnected
        && popup.getClientRects().length > 0
        && isWatchActionPopup(popup)
    );
  }

  function isWatchActionPopup(popup) {
    const itemTexts = [
      ...popup.querySelectorAll("#items > *")
    ].map((item) => getPopupItemText(item));

    return itemTexts.includes("report") || itemTexts.includes("remove ads");
  }

  function getWatchActionMenuItem(actionKey) {
    return document.querySelector(`[${WATCH_ACTION_MENU_ITEM_ATTR}="${actionKey}"]`);
  }

  function getWatchActionPlaceholder(actionKey) {
    return document.querySelector(`[${WATCH_ACTION_PLACEHOLDER_ATTR}="${actionKey}"]`);
  }

  function restoreWatchActionMenuItem(actionKey) {
    const actionContainer = getWatchActionMenuItem(actionKey);
    if (!actionContainer) {
      return;
    }

    const placeholder = getWatchActionPlaceholder(actionKey);
    if (actionContainer && placeholder && actionContainer.previousElementSibling !== placeholder) {
      placeholder.after(actionContainer);
    }

    actionContainer.removeAttribute(WATCH_ACTION_MENU_ITEM_ATTR);
  }

  function getWatchPopupDropdown(popup) {
    return popup.closest("tp-yt-iron-dropdown");
  }

  function normalizeWatchPopupLayout(popup) {
    const dropdown = getWatchPopupDropdown(popup);
    const itemsRoot = popup.querySelector("#items");

    popup.style.maxHeight = "none";
    popup.style.maxWidth = "none";
    popup.style.overflow = "visible";

    if (itemsRoot) {
      itemsRoot.style.maxHeight = "none";
      itemsRoot.style.maxWidth = "none";
      itemsRoot.style.overflow = "visible";
    }

    if (dropdown) {
      dropdown.style.maxHeight = "none";
      dropdown.style.maxWidth = "none";
    }
  }

  function requestWatchPopupRelayout(popup) {
    const dropdown = getWatchPopupDropdown(popup);
    normalizeWatchPopupLayout(popup);

    const relayoutTargets = [popup, dropdown].filter(Boolean);
    for (const target of relayoutTargets) {
      if (typeof target.refit === "function") {
        try {
          target.refit();
        } catch (error) {
          // Ignore component relayout failures.
        }
      }

      if (typeof target.notifyResize === "function") {
        try {
          target.notifyResize();
        } catch (error) {
          // Ignore component relayout failures.
        }
      }
    }

    window.dispatchEvent(new Event("resize"));
  }

  function ensureWatchActionMenuItem(popup, action, actionContainer) {
    const itemsRoot = popup.querySelector("#items");
    if (!itemsRoot) {
      return null;
    }

    actionContainer.setAttribute(WATCH_ACTION_MENU_ITEM_ATTR, action.key);
    if (actionContainer.parentElement !== itemsRoot) {
      itemsRoot.prepend(actionContainer);
    }

    return actionContainer;
  }

  function syncWatchActionMenuItems(actionContainers) {
    const popups = getVisibleWatchActionPopups();
    const menuActions = WATCH_ACTIONS.filter(
      (action) => currentSettings[action.key] === "menu" && actionContainers[action.key]
    );

    for (const action of WATCH_ACTIONS) {
      const shouldKeepInjectedItem = menuActions.some((menuAction) => menuAction.key === action.key)
        && popups.length > 0;
      if (!shouldKeepInjectedItem) {
        restoreWatchActionMenuItem(action.key);
      }
    }

    if (popups.length === 0 || menuActions.length === 0) {
      return;
    }

    const popup = popups[0];
    const itemsRoot = popup.querySelector("#items");
    if (!itemsRoot) {
      return;
    }

    let insertBeforeNode = itemsRoot.firstElementChild;
    for (const action of menuActions) {
      const injectedAction = ensureWatchActionMenuItem(popup, action, actionContainers[action.key]);
      if (!injectedAction) {
        continue;
      }

      if (injectedAction !== insertBeforeNode) {
        itemsRoot.insertBefore(injectedAction, insertBeforeNode);
      }

      insertBeforeNode = injectedAction.nextElementSibling;
    }

    requestWatchPopupRelayout(popup);
  }

  function hideRemoveAdsMenuItems() {
    if (!currentSettings.hideRemoveAdsButton || !isWatchPage()) {
      return;
    }

    for (const popup of getVisibleWatchActionPopups()) {
      const items = popup.querySelectorAll("#items > *");
      for (const item of items) {
        if (getPopupItemText(item) !== "remove ads") {
          continue;
        }

        if (item.getAttribute(REMOVE_ADS_HIDDEN_ATTR) === "1") {
          continue;
        }

        item.setAttribute(REMOVE_ADS_HIDDEN_ATTR, "1");
        item.setAttribute(REMOVE_ADS_PREV_DISPLAY_ATTR, item.style.display || "");
        item.style.display = "none";
      }

      requestWatchPopupRelayout(popup);
    }
  }

  function applyWatchPageActionState() {
    restoreRemoveAdsMenuItems();

    if (!isWatchPage()) {
      for (const action of WATCH_ACTIONS) {
        restoreWatchActionMenuItem(action.key);
      }
      restoreWatchActionPlacement();
      return;
    }

    const menuRenderer = getWatchMenuRenderer();
    const flexibleButtons = menuRenderer?.querySelector(":scope > #flexible-item-buttons");
    const actionContainers = {};

    for (const action of WATCH_ACTIONS) {
      const actionContainer = findWatchActionContainer(menuRenderer, action);
      if (!actionContainer) {
        continue;
      }

      ensureWatchActionPlaceholder(actionContainer, action.key);
      actionContainers[action.key] = actionContainer;
    }

    syncWatchActionMenuItems(actionContainers);

    for (const action of WATCH_ACTIONS) {
      const actionContainer = actionContainers[action.key];
      if (!actionContainer) {
        continue;
      }

      const mode = currentSettings[action.key];
      const injectedMenuItem = getWatchActionMenuItem(action.key);

      if (mode !== "menu" || !injectedMenuItem) {
        restoreWatchActionMenuItem(action.key);
      }

      if (mode === "row" && flexibleButtons) {
        unhideWatchActionContainer(actionContainer);
        if (actionContainer.parentElement !== flexibleButtons) {
          flexibleButtons.append(actionContainer);
        }
        continue;
      }

      if (mode === "menu" && getWatchActionMenuItem(action.key)) {
        unhideWatchActionContainer(actionContainer);
        continue;
      }

      if (mode === "hide" || mode === "menu") {
        restoreWatchActionToPlaceholder(action.key, actionContainer);
        hideWatchActionContainer(actionContainer);
        continue;
      }

      restoreWatchActionToPlaceholder(action.key, actionContainer);
      unhideWatchActionContainer(actionContainer);
    }

    hideRemoveAdsMenuItems();
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
    applyWatchPageActionState();
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
      currentSettings[key] = normalizeSettingValue(key, settings[key]);
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

        currentSettings[key] = normalizeSettingValue(key, changes[key].newValue);
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
