# MythicSuite multi-page website

This build is ready for GitHub Pages and uses relative links, so it works under `https://mythicghoul.github.io/MythicSuite/`.

## Pages
- `index.html` — homepage
- `resources/index.html` — searchable resource catalogue
- `statistics/index.html` — download and rating statistics
- `about/index.html` — creator and design philosophy
- `plugins/<plugin>/index.html` — 26 detailed plugin pages

## Upload
Upload the **contents** of this folder to the root of the `MythicSuite` repository, preserving the folders. Replace the old files.

## Direct downloads
Plugin pages currently link to SpigotMC and Modrinth where available. For direct downloads, add a GitHub Release URL to the appropriate plugin page button or extend `assets/plugins.json` and regenerate the page.

## Statistics
Static fallback statistics were captured on 12 July 2026. `assets/site.js` attempts to refresh supported Spigot and Modrinth numbers through public APIs, but the static page remains fully usable if an API is unavailable.
