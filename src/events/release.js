import path from 'path';
import { githubFetch, sendDiscord, readState, writeState, smpEmbed } from '../utils.js';
import { COLORS, FETCH_LIMITS, STATE_DIR, STATE_FILES } from '../config.js';

export async function handleRelease(repo, token, webhookUrl) {
  const repoName = repo.full_name;
  const stateFile = path.join(STATE_DIR, STATE_FILES.release);

  const state = await readState(stateFile);
  const seenIds = new Set(state[repoName] || []);

  console.log(`[Release] Checking ${repoName} | seen IDs: ${[...seenIds].join(', ') || 'none'}`);

  let releases;
  try {
    releases = await githubFetch(
      `/repos/${repoName}/releases?per_page=${FETCH_LIMITS.releases}`,
      token
    );
  } catch (err) {
    console.error(`[Release] Failed to fetch releases for ${repoName}: ${err.message}`);
    return;
  }

  if (!Array.isArray(releases) || releases.length === 0) {
    console.log(`[Release] No releases found for ${repoName}`);
    return;
  }

  const newReleases = releases.filter((r) => !seenIds.has(r.id));

  if (newReleases.length === 0) {
    console.log(`[Release] No new releases for ${repoName}`);
    return;
  }

  for (const release of newReleases.reverse()) {
    const actor = release.author?.login || 'Unknown';
    const tag = release.tag_name;
    const name = (release.name || tag).slice(0, 120);
    const body = release.body?.slice(0, 300) || '_No release notes provided._';
    const prerelease = release.prerelease ? '🔶 Pre-release' : '🟢 Stable';
    const timestamp = release.published_at || release.created_at;
    const assetCount = release.assets?.length || 0;

    const embed = smpEmbed(
      name,
      `**${actor}** published a new release in \`${repoName}\`\n\n${body}${body.length === 300 ? '…' : ''}`,
      release.html_url,
      COLORS.release,
      timestamp
    );

    embed.fields = [
      { name: 'Tag', value: `\`${tag}\``, inline: true },
      { name: 'Type', value: prerelease, inline: true },
      { name: 'Assets', value: `${assetCount} file${assetCount !== 1 ? 's' : ''}`, inline: true },
      { name: 'Published by', value: actor, inline: true },
      { name: 'Repository', value: repoName, inline: false },
    ];

    try {
      await sendDiscord(webhookUrl, embed);
      seenIds.add(release.id);
    } catch (err) {
      console.error(`[Release] Failed to send Discord for release ${tag}: ${err.message}`);
    }
  }

  state[repoName] = [...seenIds];
  await writeState(stateFile, state);
  console.log(`[Release] State updated for ${repoName}`);
}
