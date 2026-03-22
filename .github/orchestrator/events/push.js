import { githubFetch, sendDiscord, readState, writeState, smpEmbed } from '../utils.js';
import { config } from '../config.js';
import path from 'path';

export async function handlePush(repoName, webhook, token) {
  const stateFile = path.resolve('.github/orchestrator/state/push.json');
  let state = await readState(stateFile);

  const commits = await githubFetch(`${repoName}/commits?per_page=5`, token);
  for (const commit of commits.reverse()) {
    if (state.lastCommit === commit.sha) continue;

    const embed = smpEmbed(
      `Push in ${repoName}`,
      `✦︱Actor: ${commit.commit.author.name}\n✦︱Message: ${commit.commit.message}`,
      commit.html_url,
      config.colors.push,
      commit.commit.author.date
    );

    await sendDiscord(webhook, embed);
    state.lastCommit = commit.sha;
  }

  await writeState(stateFile, state);
}
