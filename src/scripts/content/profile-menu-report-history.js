(function () {
  const DOM = globalThis.YTX_YOUTUBE_DOM;
  if (!DOM) {
    console.warn("Unshittified YouTube: YouTube DOM helpers are missing for profile menu features.");
    return;
  }

  const { normalizeText } = DOM;
  const PROFILE_MENU_REPORT_HISTORY_ATTR = "data-ytx-profile-report-history-entry";

  function removeInjectedProfileReportHistoryEntries() {
    for (const node of document.querySelectorAll(`ytd-compact-link-renderer[${PROFILE_MENU_REPORT_HISTORY_ATTR}="1"]`)) {
      node.remove();
    }
  }

  function getReportHistoryIconPath() {
    const sidebarIconPath = document.querySelector('ytd-guide-renderer a#endpoint[href="/reporthistory"] yt-icon path');
    return sidebarIconPath?.getAttribute("d") || "";
  }

  function setProfileMenuIcon(compactLinkRenderer, iconPath) {
    if (!iconPath) {
      return;
    }

    const contentIcon = compactLinkRenderer.querySelector("#content-icon");
    if (!contentIcon) {
      return;
    }

    contentIcon.removeAttribute("hidden");

    let iconHost = contentIcon.querySelector("yt-icon");
    if (!iconHost) {
      iconHost = document.createElement("yt-icon");
      iconHost.className = "style-scope ytd-compact-link-renderer";
      contentIcon.append(iconHost);
    }

    iconHost.removeAttribute("hidden");
    iconHost.textContent = "";

    const shape = document.createElement("span");
    shape.className = "yt-icon-shape style-scope yt-icon ytSpecIconShapeHost";

    const wrapper = document.createElement("div");
    wrapper.style.width = "100%";
    wrapper.style.height = "100%";
    wrapper.style.display = "block";
    wrapper.style.fill = "currentcolor";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("height", "24");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "24");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("aria-hidden", "true");
    svg.style.pointerEvents = "none";
    svg.style.display = "inherit";
    svg.style.width = "100%";
    svg.style.height = "100%";

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", iconPath);

    svg.append(path);
    wrapper.append(svg);
    shape.append(wrapper);
    iconHost.append(shape);
  }

  function renderProfileReportHistoryItem(compactLinkRenderer, iconPath) {
    if (!compactLinkRenderer) {
      return;
    }

    const endpoint = compactLinkRenderer.querySelector("a#endpoint");
    if (!endpoint) {
      return;
    }

    endpoint.setAttribute("href", "/reporthistory");
    endpoint.setAttribute("title", "Report history");
    endpoint.removeAttribute("hidden");

    const contentIcon = compactLinkRenderer.querySelector("#content-icon");
    if (contentIcon) {
      contentIcon.removeAttribute("hidden");
    }

    const primaryTextContainer = compactLinkRenderer.querySelector("#primary-text-container");
    if (primaryTextContainer) {
      primaryTextContainer.removeAttribute("hidden");
    }

    const labelNode = compactLinkRenderer.querySelector("#label");
    if (labelNode) {
      labelNode.textContent = "Report history";
      labelNode.removeAttribute("is-empty");
      labelNode.removeAttribute("hidden");
    }

    const subtitleNode = compactLinkRenderer.querySelector("#subtitle");
    if (subtitleNode) {
      subtitleNode.textContent = "";
      subtitleNode.setAttribute("is-empty", "");
    }

    const secondaryTextNode = compactLinkRenderer.querySelector("#secondary-text");
    if (secondaryTextNode) {
      secondaryTextNode.textContent = "";
      secondaryTextNode.setAttribute("hidden", "");
      secondaryTextNode.setAttribute("is-empty", "");
    }

    setProfileMenuIcon(compactLinkRenderer, iconPath);
  }

  function createProfileReportHistoryItem(helpItem, iconPath) {
    const clonedItem = helpItem.cloneNode(true);
    clonedItem.setAttribute(PROFILE_MENU_REPORT_HISTORY_ATTR, "1");
    renderProfileReportHistoryItem(clonedItem, iconPath);

    return clonedItem;
  }

  function findProfileMenuHelpItem(sectionsRoot) {
    const menuItems = sectionsRoot.querySelectorAll(
      "yt-multi-page-menu-section-renderer > #items > ytd-compact-link-renderer"
    );

    for (const item of menuItems) {
      if (!item.isConnected || item.getClientRects().length === 0) {
        continue;
      }

      const endpoint = item.querySelector("a#endpoint");
      if (endpoint?.hasAttribute("href")) {
        continue;
      }

      const labelText = normalizeText(item.querySelector("#label")?.textContent || "");
      if (labelText === "help") {
        return item;
      }
    }

    return null;
  }

  function applyProfileReportHistoryMenuState(settings) {
    if (!settings.addReportHistoryToProfileMenu) {
      removeInjectedProfileReportHistoryEntries();
      return;
    }

    const iconPath = getReportHistoryIconPath();
    const profileMenus = document.querySelectorAll("ytd-popup-container ytd-multi-page-menu-renderer");

    for (const profileMenu of profileMenus) {
      if (!profileMenu.querySelector("#header ytd-active-account-header-renderer")) {
        continue;
      }

      const sectionsRoot = profileMenu.querySelector("#container #sections");
      if (!sectionsRoot) {
        continue;
      }

      const helpItem = findProfileMenuHelpItem(sectionsRoot);
      if (!helpItem) {
        continue;
      }

      const existingReportHistoryItem = sectionsRoot.querySelector(
        `ytd-compact-link-renderer[${PROFILE_MENU_REPORT_HISTORY_ATTR}="1"]`
      );

      if (existingReportHistoryItem) {
        renderProfileReportHistoryItem(existingReportHistoryItem, iconPath);
        if (existingReportHistoryItem.nextElementSibling !== helpItem) {
          helpItem.before(existingReportHistoryItem);
        }
        continue;
      }

      if (
        sectionsRoot.querySelector(
          `ytd-compact-link-renderer:not([${PROFILE_MENU_REPORT_HISTORY_ATTR}="1"]) a#endpoint[href="/reporthistory"]`
        )
      ) {
        continue;
      }

      const reportHistoryItem = createProfileReportHistoryItem(helpItem, iconPath);
      helpItem.before(reportHistoryItem);
    }
  }

  globalThis.YTX_PROFILE_MENU_FEATURES = {
    applyProfileReportHistoryMenuState
  };
})();
