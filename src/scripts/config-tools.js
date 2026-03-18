(function () {
  const SETTINGS = globalThis.YTX_SETTINGS;
  const DEFAULT_SETTINGS = globalThis.YTX_DEFAULT_SETTINGS;

  if (!Array.isArray(SETTINGS) || !DEFAULT_SETTINGS) {
    console.warn("Unshittified YouTube: settings schema is missing in config tools context.");
    return;
  }

  const api = globalThis.browser?.storage ? globalThis.browser : globalThis.chrome;
  const storageArea = api?.storage?.local;
  const LEGACY_CONFIG_SCHEMA = "unshittified-youtube-toggle-config";
  const CONFIG_SCHEMA = "unshittified-youtube-settings-config";
  const CONFIG_VERSION = 2;
  const SETTING_KEYS = SETTINGS.map((setting) => setting.key);
  const SETTING_KEY_SET = new Set(SETTING_KEYS);
  const SETTINGS_BY_KEY = Object.freeze(
    Object.fromEntries(SETTINGS.map((setting) => [setting.key, setting]))
  );
  let statusTimeout = null;

  function showStatus(message, tone) {
    const status = document.getElementById("status");
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
    }, 3500);
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
      // Fall back to callback API.
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
      // Fall back to callback API.
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

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function normalizeSettingValue(setting, value) {
    if (setting.type === "select") {
      return setting.options?.includes(value) ? value : setting.defaultValue;
    }

    return Boolean(value);
  }

  function buildExportPayload(settings) {
    const exportedSettings = {};
    for (const setting of SETTINGS) {
      exportedSettings[setting.key] = normalizeSettingValue(setting, settings[setting.key]);
    }

    return {
      schema: CONFIG_SCHEMA,
      version: CONFIG_VERSION,
      exportedAt: new Date().toISOString(),
      settings: exportedSettings
    };
  }

  function validateAndNormalizeSettingsObject(sourceSettings) {
    if (!isPlainObject(sourceSettings)) {
      throw new Error("Config must contain a settings object.");
    }

    const sourceKeys = Object.keys(sourceSettings);
    const unknownKeys = sourceKeys.filter((key) => !SETTING_KEY_SET.has(key));
    if (unknownKeys.length > 0) {
      throw new Error(`Unknown setting keys: ${unknownKeys.join(", ")}`);
    }

    const missingKeys = SETTING_KEYS.filter(
      (key) => !Object.prototype.hasOwnProperty.call(sourceSettings, key)
    );
    if (missingKeys.length > 0) {
      throw new Error(`Missing setting keys: ${missingKeys.join(", ")}`);
    }

    const invalidValueKeys = [];
    for (const key of SETTING_KEYS) {
      const setting = SETTINGS_BY_KEY[key];
      const value = sourceSettings[key];
      if (setting.type === "select") {
        if (typeof value !== "string" || !setting.options?.includes(value)) {
          invalidValueKeys.push(`${key} (${JSON.stringify(value)})`);
        }
        continue;
      }

      if (typeof value !== "boolean") {
        invalidValueKeys.push(`${key} (${typeof value})`);
      }
    }

    if (invalidValueKeys.length > 0) {
      throw new Error(`Invalid setting values: ${invalidValueKeys.join(", ")}`);
    }

    return Object.fromEntries(
      SETTINGS.map((setting) => [setting.key, normalizeSettingValue(setting, sourceSettings[setting.key])])
    );
  }

  function normalizeImportedSettings(payload) {
    if (!isPlainObject(payload)) {
      throw new Error("Invalid config: root must be a JSON object.");
    }

    let sourceSettings = payload;

    if (Object.prototype.hasOwnProperty.call(payload, "settings")) {
      if (!isPlainObject(payload.settings)) {
        throw new Error("Invalid config: settings must be an object.");
      }

      const schema = Object.prototype.hasOwnProperty.call(payload, "schema") ? payload.schema : CONFIG_SCHEMA;
      const version = Object.prototype.hasOwnProperty.call(payload, "version") ? payload.version : CONFIG_VERSION;

      if (schema === LEGACY_CONFIG_SCHEMA && version === 1) {
        sourceSettings = { ...DEFAULT_SETTINGS, ...payload.settings };
        return validateAndNormalizeSettingsObject(sourceSettings);
      }

      if (schema !== CONFIG_SCHEMA) {
        throw new Error(`Unsupported config schema: ${String(payload.schema)}`);
      }

      if (version !== CONFIG_VERSION) {
        throw new Error(`Unsupported config version: ${String(payload.version)}.`);
      }

      sourceSettings = payload.settings;
    }

    return validateAndNormalizeSettingsObject(sourceSettings);
  }

  function triggerJsonDownload(filename, content) {
    const blob = new Blob([content], { type: "application/json" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }

  async function exportConfig() {
    const settings = await getFromStorage(DEFAULT_SETTINGS);
    const payload = buildExportPayload(settings);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `unshittified-youtube-config-${timestamp}.json`;
    triggerJsonDownload(filename, JSON.stringify(payload, null, 2));
    showStatus("Config exported.", "success");
  }

  async function importConfigFile(file) {
    if (!file) {
      return;
    }

    const rawText = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      throw new Error("File is not valid JSON.");
    }

    const importedSettings = normalizeImportedSettings(parsed);
    await setInStorage(importedSettings);
    showStatus("Config imported.", "success");
  }

  function init() {
    const exportButton = document.getElementById("exportConfig");
    const importButton = document.getElementById("importConfigButton");
    const importInput = document.getElementById("importConfigFile");

    if (exportButton) {
      exportButton.addEventListener("click", async () => {
        try {
          await exportConfig();
        } catch (error) {
          showStatus(error?.message || "Failed to export config.", "error");
        }
      });
    }

    if (importButton && importInput) {
      importButton.addEventListener("click", () => {
        importInput.click();
      });
    }

    if (importInput) {
      importInput.addEventListener("change", async () => {
        const file = importInput.files?.[0];
        try {
          await importConfigFile(file);
        } catch (error) {
          showStatus(error?.message || "Failed to import config.", "error");
        } finally {
          importInput.value = "";
        }
      });
    }
  }

  init();
})();
