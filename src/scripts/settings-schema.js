(function () {
  const SETTINGS = Object.freeze([
    { key: "hideCountryCode", defaultValue: false },
    { key: "hideVoiceSearchButton", defaultValue: false },
    { key: "hideExploreSection", defaultValue: false },
    { key: "hideMoreFromYoutubeSection", defaultValue: false },
    { key: "hideSubscriptionChannels", defaultValue: false },
    { key: "hideSidebarFooter", defaultValue: false },
    { key: "hideMostRelevantSection", defaultValue: false },
    { key: "hideShortsSection", defaultValue: false }
  ]);

  const DEFAULT_SETTINGS = Object.freeze(
    Object.fromEntries(SETTINGS.map((setting) => [setting.key, setting.defaultValue]))
  );

  globalThis.YTX_SETTINGS = SETTINGS;
  globalThis.YTX_DEFAULT_SETTINGS = DEFAULT_SETTINGS;
})();