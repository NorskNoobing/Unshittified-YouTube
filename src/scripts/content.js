(function () {
  const DEFAULT_SETTINGS = globalThis.YTX_DEFAULT_SETTINGS;
  const STORAGE = globalThis.YTX_STORAGE;
  const SIDEBAR_MUTATIONS = globalThis.YTX_SIDEBAR_MUTATIONS;
  const PROFILE_MENU_FEATURES = globalThis.YTX_PROFILE_MENU_FEATURES;

  if (!DEFAULT_SETTINGS || !STORAGE) {
    console.warn("Unshittified YouTube: required shared scripts are missing in content context.");
    return;
  }

  const SETTINGS_CONFIG = {
    ...(globalThis.YTX_GENERAL_UI_FEATURES || {}),
    ...(globalThis.YTX_SIDEBAR_FEATURES || {}),
    ...(globalThis.YTX_SUBSCRIPTIONS_FEED_FEATURES || {})
  };
  const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);
  const { api, getSettings } = STORAGE;

  const currentSettings = { ...DEFAULT_SETTINGS };
  let scheduleQueued = false;

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

  function applyHideFeatures() {
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
  }

  function applyCurrentState() {
    applyHideFeatures();
    SIDEBAR_MUTATIONS?.applyYouSectionDividerState(currentSettings);
    PROFILE_MENU_FEATURES?.applyProfileReportHistoryMenuState(currentSettings);
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
