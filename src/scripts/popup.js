(function () {
  const SETTINGS = globalThis.YTX_SETTINGS;
  const DEFAULT_SETTINGS = globalThis.YTX_DEFAULT_SETTINGS;
  const STORAGE = globalThis.YTX_STORAGE;

  if (!Array.isArray(SETTINGS) || !DEFAULT_SETTINGS || !STORAGE) {
    console.warn("Unshittified YouTube: required shared scripts are missing in popup context.");
    return;
  }

  const { api, getSettings, setSetting } = STORAGE;
  let statusTimeout = null;

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

    const url = api?.runtime?.getURL ? api.runtime.getURL("src/pages/config-tools.html") : "src/pages/config-tools.html";
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
