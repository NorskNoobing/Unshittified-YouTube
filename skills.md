# YouTube Extension Skills

This extension targets both Chrome and Firefox, with a focus on UI customization first and feature additions later.
All features should be individually toggleable by the user.

## Initial skills
- Theme and style overrides for YouTube pages
- Layout tweaks (spacing, typography, sidebar/video page polish)
- Cross-browser compatibility (Manifest V3 where possible, browser API abstraction)
- Language-agnostic DOM matching (prefer stable IDs/endpoints/structure over localized UI text)
- Per-feature toggles in a settings UI with persistent storage

## Future skills
- Quality-of-life controls (hide/show UI blocks, cleaner watch page)
- Productivity features (shortcuts, defaults, persistent preferences)
- Optional power features (custom filters, metadata overlays, automation hooks)
