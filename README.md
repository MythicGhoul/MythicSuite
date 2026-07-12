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


## Spigot ratings and reviews

Public Spigot plugin pages include a live community-feedback panel. The rating summary and latest reviews are fetched in the visitor's browser through the Spiget API. Static rating values remain visible if the API cannot be reached.


## Clean typography update

The website now uses a cleaner native sans-serif type system across headings,
body copy, navigation, plugin cards, statistics and review panels. No external
font files are required.


## Plugin artwork

The resource catalogue and detailed plugin pages now use all matching supplied
pixel-art plugin badges. Existing artwork is retained for EXP-Gems and
PixelBlood, while the remaining plugins without supplied badge artwork keep
their previous site icons.


## Full plugin descriptions

Every detailed plugin page now includes a long-form overview, how-it-works section, administration notes, an expanded feature breakdown, compatibility details and rollout steps. The source content is also stored under `longDescription` inside `assets/plugins.json` for easier maintenance.
