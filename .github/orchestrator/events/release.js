import { githubFetch, sendDiscord, readState, writeState, smpEmbed } from '../utils.js';
import { config } from '../config.js';
import path from 'path';

export async function handleRelease(repoName, webhook, token) {
  const stateFile = path.resolve('.github/orchestrator/state/release.json');
  let state = await readState(stateFile);

  // fetch the 3 most recent releases
  const releases = await githubFetch(`${repoName}/releases?per_page=3`, token);

  for (const release of releases.reverse()) {
    if (state.lastRelease === release.id) continue;

    const embed = smpEmbed(
      `Release: ${release.tag_name}`,
      `✦︱Author: ${release.author.login}\n✦︱Name: ${release.name || release.tag_name}`,
      release.html_url,
      config.colors.release,
      release.published_at
    );

    await sendDiscord(webhook, embed);
    state.lastRelease = release.id;
  }

  await writeState(stateFile, state);
}
