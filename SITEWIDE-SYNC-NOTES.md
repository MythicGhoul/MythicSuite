# MythicSuite site-wide admin synchronisation patch

This patch fixes status changes appearing on one page but not another.

It makes `assets/plugins.json` authoritative for:

- Resource catalogue status badges
- Resource filters
- Resource card category and tags
- Non-public card status rows
- Plugin page status badge
- Project-details availability
- Non-public release-status metrics
- Non-public download/action messages
- Related plugin cards

The patch does not contain `assets/plugins.json`, so it will not overwrite any
changes already published through `/admin/`.

Upload every file in this patch and replace matching repository files.
