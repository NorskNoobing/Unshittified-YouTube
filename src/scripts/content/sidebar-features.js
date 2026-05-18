(function () {
  const DOM = globalThis.YTX_YOUTUBE_DOM;
  if (!DOM) {
    console.warn("Unshittified YouTube: YouTube DOM helpers are missing for sidebar features.");
    return;
  }

  const {
    getAllGuideSections,
    getGuideSectionsByEndpointMatchers,
    getGuideSectionsByTitles
  } = DOM;

  const YOU_SECTION_DIVIDER_ATTR = "data-ytx-hide-you-section-divider";
  const YOU_SECTION_PREV_STYLE_ATTR = "data-ytx-prev-you-section-style";

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

  function shouldHideYouSectionDivider(settings) {
    return Boolean(
      settings.hideExploreSection
      && settings.hideMoreFromYoutubeSection
      && settings.hideSidebarFooter
      && settings.hideSettingsHelpSection
    );
  }

  function applyYouSectionDividerState(settings) {
    clearYouDividerOverrides();

    if (!shouldHideYouSectionDivider(settings)) {
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

  globalThis.YTX_SIDEBAR_FEATURES = {
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
    }
  };

  globalThis.YTX_SIDEBAR_MUTATIONS = {
    applyYouSectionDividerState
  };
})();
