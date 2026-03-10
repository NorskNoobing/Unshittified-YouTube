(function () {
  const SETTINGS = [
    { key: "hideCountryCode", defaultValue: false },
    { key: "hideVoiceSearchButton", defaultValue: false },
    { key: "hideExploreSection", defaultValue: false },
    { key: "hideMoreFromYoutubeSection", defaultValue: false },
    { key: "hideMostRelevantSection", defaultValue: true },
    { key: "hideShortsSection", defaultValue: false }
  ];
  const DEFAULT_SETTINGS = Object.fromEntries(
    SETTINGS.map((setting) => [setting.key, setting.defaultValue])
  );
  const api = globalThis.browser?.storage ? globalThis.browser : globalThis.chrome;
  const storageArea = api?.storage?.local;

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

  function setInStorage(values) {
    if (!storageArea) {
      return Promise.resolve();
    }

    try {
      const result = storageArea.set(values);
      if (result && typeof result.then === "function") {
        return result;
      }
    } catch (error) {
      // Fall back to callback-style API.
    }

    return new Promise((resolve) => {
      storageArea.set(values, resolve);
    });
  }

  async function getSettings(defaults) {
    try {
      return await getFromStorage(defaults);
    } catch (error) {
      return { ...defaults };
    }
  }

  async function setSetting(key, value) {
    try {
      await setInStorage({ [key]: value });
    } catch (error) {
      // Ignore storage write failures.
    }
  }

  function initSectionButtons() {
    const buttons = [...document.querySelectorAll(".section-btn[data-section]")];
    const panels = [...document.querySelectorAll(".section-panel[data-panel]")];

    function setActiveSection(sectionName) {
      for (const button of buttons) {
        button.classList.toggle("is-active", button.dataset.section === sectionName);
      }

      for (const panel of panels) {
        panel.classList.toggle("is-active", panel.dataset.panel === sectionName);
      }
    }

    for (const button of buttons) {
      button.addEventListener("click", () => {
        setActiveSection(button.dataset.section);
      });
    }
  }

  async function init() {
    initSectionButtons();
    const settings = await getSettings(DEFAULT_SETTINGS);

    for (const setting of SETTINGS) {
      const checkbox = document.getElementById(setting.key);
      if (!checkbox) {
        continue;
      }

      checkbox.checked = Boolean(settings[setting.key]);
      checkbox.addEventListener("change", async () => {
        await setSetting(setting.key, checkbox.checked);
      });
    }
  }

  init();
})();