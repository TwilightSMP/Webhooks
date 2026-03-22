import path from 'path';
import { githubFetch, sendDiscord, readState, writeState, smpEmbed } from '../utils.js';
import { COLORS, FETCH_LIMITS, STATE_DIR, STATE_FILES } from '../config.js';

const ISSUE_STATES = {
  open: '🟡 Opened',
  closed: '⚫ Closed',
};

export async function handleIssues(repo, token, webhookUrl) {
  const repoName = repo.full_name;
  const stateFile = path.join(STATE_DIR, STATE_FILES.issues);

  const state = await readState(stateFile);
  const seenIds = new Set(state[repoName] || []);

  console.log(`[Issues] Checking ${repoName} | seen IDs: ${[...seenIds].join(', ') || 'none'}`);

  let issues;
  try {
    issues = await githubFetch(
      `/repos/${repoName}/issues?state=all&per_page=${FETCH_LIMITS.issues}&sort=updated&direction=desc`,
      token
    );
  } catch (err) {
    console.error(`[Issues] Failed to fetch issues for ${repoName}: ${err.message}`);
    return;
  }

  if (!Array.isArray(issues) || issues.length === 0) {
    console.log(`[Issues] No issues found for ${repoName}`);
    return;
  }

  const realIssues = issues.filter((issue) => !issue.pull_request);

  if (realIssues.length === 0) {
    console.log(`[Issues] No non-PR issues for ${repoName}`);
    return;
  }

  const newIssues = realIssues.filter((issue) => !seenIds.has(issue.id));

  if (newIssues.length === 0) {
    console.log(`[Issues] No new issues for ${repoName}`);
    return;
  }

  for (const issue of newIssues.reverse()) {
    const actor = issue.user?.login || 'Unknown';
    const title = issue.title.slice(0, 120);
    const statusLabel = ISSUE_STATES[issue.state] || issue.state;
    const labels = issue.labels?.map((l) => `\`${l.name}\``).join(', ') || 'none';
    const body = issue.body?.slice(0, 200) || '_No description provided._';
    const timestamp = issue.created_at;

    const embed = smpEmbed(
      title,
      `**${actor}** ${statusLabel.toLowerCase()} an issue in \`${repoName}\`\n\n${body}${body.length === 200 ? '…' : ''}`,
      issue.html_url,
      COLORS.issues,
      timestamp
    );

    embed.fields = [
      { name: 'Status', value: statusLabel, inline: true },
      { name: 'Reporter', value: actor, inline: true },
      { name: 'Issue #', value: `#${issue.number}`, inline: true },
      { name: 'Labels', value: labels, inline: false },
      { name: 'Repository', value: repoName, inline: false },
    ];

    try {
      await sendDiscord(webhookUrl, embed);
      seenIds.add(issue.id);
    } catch (err) {
      console.error(`[Issues] Failed to send Discord for issue #${issue.number}: ${err.message}`);
    }
  }

  state[repoName] = [...seenIds];
  await writeState(stateFile, state);
  console.log(`[Issues] State updated for ${repoName}`);
}
