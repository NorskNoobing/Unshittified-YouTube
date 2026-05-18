(function () {
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
      // Fall back to callback-style APIs.
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
      // Fall back to callback-style APIs.
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

  globalThis.YTX_STORAGE = {
    api,
    storageArea,
    getFromStorage,
    setInStorage,
    getSettings,
    setSetting
  };
})();
