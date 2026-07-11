# MythicGhoul Plugin Hub

A responsive, dependency-free static portfolio website for the MythicGhoul Minecraft plugin collection.

## Open locally

Double-click `index.html`, or serve the folder with any static web server.

Examples:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Add your real links

Open `assets/plugins.js`.

At the top, fill in the platform URLs:

```js
platforms: [
  { name: "SpigotMC", url: "YOUR_URL" },
  { name: "Modrinth", url: "YOUR_URL" },
  { name: "Discord", url: "YOUR_URL" },
  { name: "GitHub", url: "YOUR_URL" }
]
```

Each plugin also has a `links` array. Example:

```js
links: [
  { label: "View on SpigotMC", url: "https://..." },
  { label: "Documentation", url: "https://..." }
]
```

## Add or edit plugins

Every plugin card and detail window is generated from the `plugins` array in `assets/plugins.js`. Copy an existing object, give it a unique `id`, and edit its text.

Statuses supported by the built-in filters:

- `public`
- `exclusive`
- `development`

## Hosting

The folder can be uploaded directly to GitHub Pages, Cloudflare Pages, Netlify, conventional web hosting or any server that serves static files.

## Notes

- No build command is required.
- No framework is required.
- The site uses local system font fallbacks and has no external runtime dependency.
- The platform and plugin buttons remain disabled until real URLs are supplied.
