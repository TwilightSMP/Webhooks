import path from 'path';
import { githubFetch, sendDiscord, readState, writeState, smpEmbed } from '../utils.js';
import { COLORS, FETCH_LIMITS, STATE_DIR, STATE_FILES } from '../config.js';

const PR_STATES = {
  open: '🟣 Opened',
  closed: '🔴 Closed',
  merged: '✅ Merged',
};

export async function handlePullRequest(repo, token, webhookUrl) {
  const repoName = repo.full_name;
  const stateFile = path.join(STATE_DIR, STATE_FILES.pull_request);

  const state = await readState(stateFile);
  const seenIds = new Set(state[repoName] || []);

  console.log(`[PR] Checking ${repoName} | seen IDs: ${[...seenIds].join(', ') || 'none'}`);

  let prs;
  try {
    prs = await githubFetch(
      `/repos/${repoName}/pulls?state=all&per_page=${FETCH_LIMITS.pull_requests}&sort=updated&direction=desc`,
      token
    );
  } catch (err) {
    console.error(`[PR] Failed to fetch PRs for ${repoName}: ${err.message}`);
    return;
  }

  if (!Array.isArray(prs) || prs.length === 0) {
    console.log(`[PR] No pull requests found for ${repoName}`);
    return;
  }

  const newPrs = prs.filter((pr) => !seenIds.has(pr.id));

  if (newPrs.length === 0) {
    console.log(`[PR] No new PRs for ${repoName}`);
    return;
  }

  for (const pr of newPrs.reverse()) {
    const actor = pr.user?.login || 'Unknown';
    const title = pr.title.slice(0, 120);
    const statusLabel = pr.merged_at
      ? PR_STATES.merged
      : PR_STATES[pr.state] || pr.state;
    const from = pr.head?.ref || 'unknown';
    const into = pr.base?.ref || 'unknown';
    const timestamp = pr.created_at;

    const embed = smpEmbed(
      title,
      `**${actor}** ${statusLabel.toLowerCase()} a pull request in \`${repoName}\`\n\`${from}\` → \`${into}\``,
      pr.html_url,
      COLORS.pull_request,
      timestamp
    );

    embed.fields = [
      { name: 'Status', value: statusLabel, inline: true },
      { name: 'Author', value: actor, inline: true },
      { name: 'PR #', value: `#${pr.number}`, inline: true },
      { name: 'Repository', value: repoName, inline: false },
    ];

    try {
      await sendDiscord(webhookUrl, embed);
      seenIds.add(pr.id);
    } catch (err) {
      console.error(`[PR] Failed to send Discord for PR #${pr.number}: ${err.message}`);
    }
  }

  state[repoName] = [...seenIds];
  await writeState(stateFile, state);
  console.log(`[PR] State updated for ${repoName}`);
}
