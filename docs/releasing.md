# Unshittified YouTube - Release / Build Steps

This file documents the release process for the extension.

## Build Firefox / AMO ZIP

From the repository root:

```sh
npx --yes web-ext lint --source-dir .
```

Expected result before release:

```text
errors    0
notices   0
warnings  0
```

Build the AMO upload artifact:

```sh
npx --yes web-ext build --source-dir . --artifacts-dir dist --overwrite-dest --filename unshittified_youtube-0.1.0-amo.zip --ignore-files README.md SECURITY.md skills.md "docs/**" "assets/icons/icon-2048.png" "assets/icons/initial-icon-1024-with-padding.png" "assets/icons/icon-toolbar-simplified.png"
```

Validate the final ZIP:

```sh
npx --yes web-ext lint --source-dir dist/unshittified_youtube-0.1.0-amo.zip
```

Upload this file to Mozilla Add-ons:

```text
dist/unshittified_youtube-0.1.0-amo.zip
```

## GitHub Release Flow

1. Update `manifest.json` version.
2. Run the lint and build commands above.
3. Commit source changes only. Do not commit `dist/`.
4. Tag the release:

```sh
git tag v0.1.0
git push origin main --tags
```

5. Create a GitHub Release from the tag.
6. Attach the generated AMO ZIP from `dist/` as a release asset.

GitHub CLI option:

```sh
gh release create v0.1.0 dist/unshittified_youtube-0.1.0-amo.zip --title "v0.1.0" --notes "Initial Firefox add-on release."
```

## Notes

- Keep generated ZIP files out of git.
- `.gitignore` should include `dist/` and `web-ext-artifacts/`.
- AMO requires `manifest.json` at the root of the ZIP.
- The current Firefox extension ID is `@unshittified-youtube.norsknoobing`.
- The current data collection declaration is `none`.
