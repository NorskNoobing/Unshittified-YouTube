(function () {
  const DOM = globalThis.YTX_YOUTUBE_DOM;
  if (!DOM) {
    console.warn("Unshittified YouTube: YouTube DOM helpers are missing for subscriptions features.");
    return;
  }

  const { collectSections, getTitleText, isSubscriptionsPage } = DOM;

  function isMostRelevantShelf(shelfElement) {
    if (isShortsShelf(shelfElement)) {
      return false;
    }

    const titleText = getTitleText(shelfElement);
    if (titleText.includes("most relevant")) {
      return true;
    }

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

  globalThis.YTX_SUBSCRIPTIONS_FEED_FEATURES = {
    hideMostRelevantSection: {
      hiddenAttr: "data-ytx-hidden-most-relevant",
      prevDisplayAttr: "data-ytx-prev-display-most-relevant",
      getTargetSections: getMostRelevantSections,
      shouldApply: isSubscriptionsPage
    },
    hideShortsSection: {
      hiddenAttr: "data-ytx-hidden-shorts",
      prevDisplayAttr: "data-ytx-prev-display-shorts",
      getTargetSections: getShortsSections,
      shouldApply: isSubscriptionsPage
    }
  };
})();
