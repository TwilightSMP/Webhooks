import { githubFetch, sendDiscord, readState, writeState, smpEmbed } from '../utils.js';
import { config } from '../config.js';
import path from 'path';

export async function handlePR(repoName, webhook, token) {
  const stateFile = path.resolve('.github/orchestrator/state/pr.json');
  let state = await readState(stateFile);

  const prs = await githubFetch(`${repoName}/pulls?state=open&per_page=5`, token);
  for (const pr of prs.reverse()) {
    if (state.lastPR === pr.id) continue;

    const embed = smpEmbed(
      `Pull Request: ${pr.title}`,
      `✦︱Author: ${pr.user.login}\n✦︱Action: Opened`,
      pr.html_url,
      config.colors.pr,
      pr.created_at
    );

    await sendDiscord(webhook, embed);
    state.lastPR = pr.id;
  }

  await writeState(stateFile, state);
}
