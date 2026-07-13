# Automatic Release Radar

The homepage Release Radar now updates itself from public platform APIs.

## Sources

- SpigotMC resources: Spiget latest version and latest update endpoints
- Modrinth projects: project version endpoint with release date and changelog

## Behaviour

- Fetches public release information whenever the homepage opens
- Selects the newest release for each plugin
- Deduplicates plugins published on both platforms
- Displays the three newest distinct plugin releases
- Shows version, release notes, platform, relative date and platform link
- Caches the result for 20 minutes in the visitor's browser
- Keeps three built-in fallback cards if either API is unavailable

## Direct-release plugins

To add GitHub Releases later, add a `github_repo` value such as
`MythicGhoul/PluginRepository` to a plugin entry and extend the same script
with GitHub's releases endpoint.
