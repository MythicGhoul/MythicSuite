# MythicSuite repair build

This build restores the known-good vibrant homepage layout and applies the
uploaded transparent plugin badges without changing the layout CSS.

The stylesheet and JavaScript now use new filenames:

- `assets/styles-vibrant.css`
- `assets/site-vibrant.js`

This prevents browsers and GitHub Pages from combining the new homepage HTML
with an older cached stylesheet, which caused the oversized emblem and broken
hero layout.

Upload every file and folder from this package, replacing the existing site.
