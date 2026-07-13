# MythicSuite live plugin pages and admin editor

## What changed

- Public plugin detail pages now refresh their latest version, update date and
  latest changelog from SpigotMC or Modrinth when opened.
- Static values remain visible if an API cannot be reached.
- Plugin status labels, lifecycle buckets and tags are read from
  `assets/plugins.json` on every public page.
- Resource-card filters are updated at runtime when lifecycle or tags change.
- A browser-based editor is available at `/admin/`.

## Admin access

The editor does not contain a public password. It authenticates directly to
GitHub using a fine-grained personal access token entered by the repository
owner.

Create a token with:

- Resource owner: MythicGhoul
- Repository access: Only selected repositories → MythicSuite
- Repository permissions: Contents → Read and write
- A sensible expiry date

The token is kept in sessionStorage for the current browser tab and is not
written to the repository.

## Publishing

The admin editor commits the updated `assets/plugins.json` to the selected
branch. Because the existing site publishes from the repository branch, GitHub
Pages then deploys the commit.

Admin URL:

https://mythicsuite.co.uk/admin/
