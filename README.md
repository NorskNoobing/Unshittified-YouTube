<p align="center">
  <img src="assets/icons/icon-128.png" width="96" alt="Unshittified YouTube logo" />
</p>

<h1 align="center">Unshittified YouTube</h1>

<p align="center"><strong>Toggleable YouTube UI cleanup for Chrome and Firefox.</strong></p>

<p align="center">
  <a href="https://github.com/NorskNoobing/Unshittified-YouTube/issues"><img src="https://img.shields.io/github/issues/NorskNoobing/Unshittified-YouTube" alt="Open issues" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License: Apache 2.0" /></a>
</p>

> [!NOTE]
> This extension is mostly AI generated.<br>
> I do not have much experience building browser extensions, so expect some rough edges and questionable design choices.<br>
> Suggestions, feedback, and improvements are welcome.

## Features
All features are toggleable.

| Area | Toggle |
|---|---|
| General | Hide country code next to YouTube logo |
| General | Hide voice search button |
| Sidebar | Hide "Explore" section |
| Sidebar | Hide "More from YouTube" section |
| Sidebar | Hide channels under the "Subscriptions" button (keeps the button) |
| Subscriptions page | Hide "Most relevant" shelf |
| Subscriptions page | Hide Shorts shelf |

## Config Tools
- Export toggle configuration to JSON.
- Import toggle configuration from JSON.
- Strict validation on import (schema/version, exact keys, boolean values).

## Distribution
Planned for browser store distribution (if I get to that point).

Until then, use the development loading steps below.

## Development
No build step is required.

### Load in Chrome / Chromium
1. Open `chrome://extensions`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this repository folder.

### Load in Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on...`.
3. Select this repo's `manifest.json`.

Reload the unpacked extension after code changes.

## Security
For private vulnerability disclosure, see [SECURITY](SECURITY.md).

## License
Licensed under the Apache License, Version 2.0.

See [LICENSE](LICENSE) and [NOTICE](NOTICE).