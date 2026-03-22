import path from 'path';
import { githubFetch, sendDiscord, readState, writeState, smpEmbed } from '../utils.js';
import { COLORS, FETCH_LIMITS, STATE_DIR, STATE_FILES } from '../config.js';

export async function handlePush(repo, token, webhookUrl) {
  const repoName = repo.full_name;
  const stateFile = path.join(STATE_DIR, STATE_FILES.push);

  const state = await readState(stateFile);
  const lastSeen = state[repoName] || null;

  console.log(`[Push] Checking ${repoName} | last seen SHA: ${lastSeen}`);

  let commits;
  try {
    commits = await githubFetch(
      `/repos/${repoName}/commits?per_page=${FETCH_LIMITS.commits}`,
      token
    );
  } catch (err) {
    console.error(`[Push] Failed to fetch commits for ${repoName}: ${err.message}`);
    return;
  }

  if (!Array.isArray(commits) || commits.length === 0) {
    console.log(`[Push] No commits found for ${repoName}`);
    return;
  }

  const latestSha = commits[0].sha;
  const newCommits = lastSeen
    ? commits.filter((c) => c.sha !== lastSeen && !isAfterLastSeen(commits, c.sha, lastSeen))
    : [commits[0]];

  if (newCommits.length === 0) {
    console.log(`[Push] No new commits for ${repoName}`);
    return;
  }

  for (const commit of newCommits.reverse()) {
    const author = commit.commit.author.name || commit.author?.login || 'Unknown';
    const message = commit.commit.message.split('\n')[0].slice(0, 120);
    const sha = commit.sha.slice(0, 7);
    const htmlUrl = commit.html_url;
    const timestamp = commit.commit.author.date;

    const embed = smpEmbed(
      message,
      `**${author}** pushed to \`${repoName}\`\n\`${sha}\` — [view commit](${htmlUrl})`,
      htmlUrl,
      COLORS.push,
      timestamp
    );

    embed.fields = [
      { name: 'Repository', value: repoName, inline: true },
      { name: 'Branch', value: repo.default_branch || 'main', inline: true },
      { name: 'Author', value: author, inline: true },
    ];

    try {
      await sendDiscord(webhookUrl, embed);
    } catch (err) {
      console.error(`[Push] Failed to send Discord for ${sha}: ${err.message}`);
    }
  }

  state[repoName] = latestSha;
  await writeState(stateFile, state);
  console.log(`[Push] State updated for ${repoName} → ${latestSha.slice(0, 7)}`);
}

function isAfterLastSeen(commits, sha, lastSeenSha) {
  const lastIdx = commits.findIndex((c) => c.sha === lastSeenSha);
  const thisIdx = commits.findIndex((c) => c.sha === sha);
  if (lastIdx === -1) return false;
  return thisIdx > lastIdx;
}
