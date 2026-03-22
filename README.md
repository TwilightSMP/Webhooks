# ✦ TwilightSMP Discord Orchestrator

A fully modular, cinematic GitHub → Discord webhook orchestrator for the TwilightSMP organization. Monitors all repositories and posts new commits, pull requests, issues, and releases to Discord with aesthetic `✦︱` styled embeds.

---

## Project Structure

```
.github/
  workflows/
    discord-orchestrator.yml   # GitHub Actions workflow
src/
  main.js                      # Orchestrator entry point
  config.js                    # Colors, SMP roles, settings
  utils.js                     # Shared helpers
  events/
    push.js                    # Commit handler
    pull_request.js            # PR handler
    issues.js                  # Issues handler (excludes PRs)
    release.js                 # Release handler
  package.json
state/
  push.json                    # Last seen commit SHA per repo
  pr.json                      # Seen PR IDs per repo
  issues.json                  # Seen issue IDs per repo
  release.json                 # Seen release IDs per repo
```

---

## Required Secrets

Set these in your GitHub repository or organization secrets:

| Secret | Description |
|---|---|
| `TWILIGHT_TOKEN` | GitHub PAT with `read:org` and `repo` scopes |
| `DISCORD_WEBHOOK_PUSH` | Webhook URL for commit notifications |
| `DISCORD_WEBHOOK_PR` | Webhook URL for pull requests |
| `DISCORD_WEBHOOK_ISSUES` | Webhook URL for issues |
| `DISCORD_WEBHOOK_RELEASE` | Webhook URL for releases |

---

## Discord Embed Colors

| Event | Color |
|---|---|
| Push (commits) | Purple `#9b59b6` |
| Pull Requests | Red `#e74c3c` |
| Issues | Yellow `#f1c40f` |
| Releases | Teal `#1abc9c` |
| Heartbeat | Dark `#2c2f33` |

---

## Workflow Triggers

- Every push to `main`
- Manual dispatch via `workflow_dispatch`
- Scheduled every 5 minutes (`*/5 * * * *`)

---

## State Persistence

Each event module maintains a JSON state file in `state/` tracking which events have already been posted. This prevents duplicate Discord messages across workflow runs.

State files are committed back to the repo after each run automatically through the Actions workflow (if you add a commit step), or managed per-runner. For persistent dedup across runs, consider using GitHub Actions cache or a remote store.

---

## Configuration

Edit `src/config.js` to:
- Change SMP role names (`SMP_ROLES`)
- Adjust fetch limits per event type (`FETCH_LIMITS`)
- Toggle the heartbeat message (`HEARTBEAT_ENABLED`)
- Add additional flavor text (`SMP_FLAVOR`)

---

## License

MIT — open-source and free to use.
