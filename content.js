(function () {
  const SETTINGS_CONFIG = {
    hideMostRelevantSection: {
      defaultValue: true,
      hiddenAttr: "data-ytx-hidden-most-relevant",
      prevDisplayAttr: "data-ytx-prev-display-most-relevant",
      getTargetSections: getMostRelevantSections,
      shouldApply: isSubscriptionsPage
    },
    hideShortsSection: {
      defaultValue: false,
      hiddenAttr: "data-ytx-hidden-shorts",
      prevDisplayAttr: "data-ytx-prev-display-shorts",
      getTargetSections: getShortsSections,
      shouldApply: isSubscriptionsPage
    },
    hideCountryCode: {
      defaultValue: false,
      hiddenAttr: "data-ytx-hidden-country-code",
      prevDisplayAttr: "data-ytx-prev-display-country-code",
      getTargetSections: getCountryCodeElements,
      shouldApply: () => true
    },
    hideVoiceSearchButton: {
      defaultValue: false,
      hiddenAttr: "data-ytx-hidden-voice-search",
      prevDisplayAttr: "data-ytx-prev-display-voice-search",
      getTargetSections: getVoiceSearchElements,
      shouldApply: () => true
    }
  };
  const DEFAULT_SETTINGS = Object.fromEntries(
    Object.entries(SETTINGS_CONFIG).map(([key, config]) => [key, config.defaultValue])
  );
  const api = globalThis.browser?.storage ? globalThis.browser : globalThis.chrome;
  const storageArea = api?.storage?.local;

  const currentSettings = { ...DEFAULT_SETTINGS };
  let scheduleQueued = false;

  function isSubscriptionsPage() {
    return location.pathname === "/feed/subscriptions";
  }

  function getTitleText(shelfElement) {
    const titleNode = shelfElement.querySelector("#title");
    return (titleNode?.textContent || "").trim().toLowerCase();
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

    for (const [key, config] of Object.entries(SETTINGS_CONFIG)) {
      const value = settings[key];
      currentSettings[key] = value === undefined ? config.defaultValue : Boolean(value);
    }

    scheduleApply();
  }

  function initStorageListener() {
    if (!api?.storage?.onChanged) {
      return;
    }

    api.storage.onChanged.addListener((changes) => {
      let hasRelevantChange = false;
      for (const [key, config] of Object.entries(SETTINGS_CONFIG)) {
        if (!changes[key]) {
          continue;
        }

        const nextValue = changes[key].newValue;
        currentSettings[key] = nextValue === undefined ? config.defaultValue : Boolean(nextValue);
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
