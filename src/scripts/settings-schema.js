(function () {
  const SETTINGS = Object.freeze([
    { key: "hideCountryCode", type: "boolean", defaultValue: false },
    { key: "hideVoiceSearchButton", type: "boolean", defaultValue: false },
    { key: "addReportHistoryToProfileMenu", type: "boolean", defaultValue: false },
    {
      key: "shareButtonMode",
      type: "select",
      defaultValue: "default",
      options: ["default", "row", "menu", "hide"]
    },
    {
      key: "saveButtonMode",
      type: "select",
      defaultValue: "default",
      options: ["default", "row", "menu", "hide"]
    },
    {
      key: "thanksButtonMode",
      type: "select",
      defaultValue: "default",
      options: ["default", "row", "menu", "hide"]
    },
    { key: "hideRemoveAdsButton", type: "boolean", defaultValue: false },
    { key: "hideJoinButton", type: "boolean", defaultValue: false },
    { key: "hideExploreSection", type: "boolean", defaultValue: false },
    { key: "hideMoreFromYoutubeSection", type: "boolean", defaultValue: false },
    { key: "hideSubscriptionChannels", type: "boolean", defaultValue: false },
    { key: "hideSidebarFooter", type: "boolean", defaultValue: false },
    { key: "hideSettingsHelpSection", type: "boolean", defaultValue: false },
    { key: "hideMostRelevantSection", type: "boolean", defaultValue: false },
    { key: "hideShortsSection", type: "boolean", defaultValue: false }
  ]);

  const DEFAULT_SETTINGS = Object.freeze(
    Object.fromEntries(SETTINGS.map((setting) => [setting.key, setting.defaultValue]))
  );

  globalThis.YTX_SETTINGS = SETTINGS;
  globalThis.YTX_DEFAULT_SETTINGS = DEFAULT_SETTINGS;
})();
