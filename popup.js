(function () {
  const SETTINGS = globalThis.YTX_SETTINGS;
  const DEFAULT_SETTINGS = globalThis.YTX_DEFAULT_SETTINGS;

  if (!Array.isArray(SETTINGS) || !DEFAULT_SETTINGS) {
    console.warn("Unshittified YouTube: settings schema is missing in popup context.");
    return;
  }

  const api = globalThis.browser?.storage ? globalThis.browser : globalThis.chrome;
  const storageArea = api?.storage?.local;
  let statusTimeout = null;

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

    return new Promise((resolve, reject) => {
      storageArea.get(defaults, (items) => {
        const lastError = api?.runtime?.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }

        resolve(items);
      });
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

    return new Promise((resolve, reject) => {
      storageArea.set(values, () => {
        const lastError = api?.runtime?.lastError;
        if (lastError) {
          reject(new Error(lastError.message));
          return;
        }

        resolve();
      });
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

  function showStatus(message, tone) {
    const status = document.getElementById("configStatus");
    if (!status) {
      return;
    }

    status.textContent = message || "";
    status.classList.remove("is-success", "is-error");
    if (tone === "success") {
      status.classList.add("is-success");
    } else if (tone === "error") {
      status.classList.add("is-error");
    }

    if (statusTimeout) {
      clearTimeout(statusTimeout);
    }

    statusTimeout = setTimeout(() => {
      status.textContent = "";
      status.classList.remove("is-success", "is-error");
    }, 3200);
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

  async function openConfigToolsPage() {
    if (api?.runtime?.openOptionsPage) {
      const maybePromise = api.runtime.openOptionsPage();
      if (maybePromise && typeof maybePromise.then === "function") {
        await maybePromise;
      }
      return;
    }

    const url = api?.runtime?.getURL ? api.runtime.getURL("config-tools.html") : "config-tools.html";
    window.open(url, "_blank", "noopener");
  }

  function initConfigButton() {
    const openToolsButton = document.getElementById("openConfigTools");
    if (!openToolsButton) {
      return;
    }

    openToolsButton.addEventListener("click", async () => {
      try {
        await openConfigToolsPage();
      } catch (error) {
        showStatus("Failed to open Config Tools page.", "error");
      }
    });
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

    initConfigButton();
  }

  init();
})();