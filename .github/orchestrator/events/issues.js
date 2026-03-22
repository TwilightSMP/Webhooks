import { githubFetch, sendDiscord, readState, writeState, smpEmbed } from '../utils.js';
import { config } from '../config.js';
import path from 'path';

export async function handleIssues(repoName, webhook, token) {
  const stateFile = path.resolve('.github/orchestrator/state/issues.json');
  let state = await readState(stateFile);

  // fetch the 5 most recent issues
  const issues = await githubFetch(`${repoName}/issues?state=open&per_page=5`, token);

  for (const issue of issues.reverse()) {
    // skip PRs (GitHub API returns PRs in /issues)
    if (issue.pull_request) continue;

    if (state.lastIssue === issue.id) continue;

    const embed = smpEmbed(
      `Issue: ${issue.title}`,
      `✦︱Author: ${issue.user.login}\n✦︱Status: ${issue.state}`,
      issue.html_url,
      config.colors.issues,
      issue.created_at
    );

    await sendDiscord(webhook, embed);
    state.lastIssue = issue.id;
  }

  await writeState(stateFile, state);
}
