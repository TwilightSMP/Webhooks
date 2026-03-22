import fetch from 'node-fetch';
import fs from 'fs-extra';

const org = process.env.GITHUB_ORG;
const token = process.env.TWILIGHT_TOKEN;

const webhooks = {
  push: process.env.DISCORD_WEBHOOK_PUSH,
  pr: process.env.DISCORD_WEBHOOK_PR,
  issues: process.env.DISCORD_WEBHOOK_ISSUES,
  release: process.env.DISCORD_WEBHOOK_RELEASE
};

const stateFile = '.github/state-award.json';
let state = {};
if (await fs.pathExists(stateFile)) state = await fs.readJson(stateFile);

// --- Helper Functions ---
async function saveState() { await fs.outputJson(stateFile, state); }
async function githubFetch(path) {
  const res = await fetch(`https://api.github.com/repos/${org}/${path}`, {
    headers: { Authorization: `token ${token}` }
  });
  return res.json();
}
async function sendDiscord(webhook, embed) {
  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] })
  });
}
function smpFlavor(actor, type) {
  const roles = { relic: 'Relic Holder', cursed: 'Cursed', dead: 'Dead' };
  return `✦︱**${type} Update:** ${actor} (${roles[type] || 'Adventurer'})`;
}

// --- Fetch Repos dynamically ---
const reposRes = await fetch(`https://api.github.com/orgs/${org}/repos`, {
  headers: { Authorization: `token ${token}` }
});
const repos = await reposRes.json();

// --- Process each repo ---
for (const repo of repos) {
  const name = repo.name;

  // --- Push Commits ---
  const commits = await githubFetch(`${name}/commits?per_page=5`);
  for (const c of commits.reverse()) {
    if (state.lastCommit === c.sha) continue;
    await sendDiscord(webhooks.push, {
      color: 0x9b59b6,
      title: `✦︱Push in ${name}`,
      description: smpFlavor(c.commit.author.name, 'relic') + `\nMessage: ${c.commit.message}`,
      url: c.html_url,
      timestamp: c.commit.author.date
    });
    state.lastCommit = c.sha;
  }

  // --- Pull Requests ---
  const prs = await githubFetch(`${name}/pulls?state=open&per_page=5`);
  for (const pr of prs.reverse()) {
    if (state.lastPR === pr.id) continue;
    await sendDiscord(webhooks.pr, {
      color: 0xe74c3c,
      title: `✦︱PR ${pr.title}`,
      description: smpFlavor(pr.user.login, 'cursed') + `\nAction: Opened`,
      url: pr.html_url,
      timestamp: pr.created_at
    });
    state.lastPR = pr.id;
  }

  // --- Issues ---
  const issues = await githubFetch(`${name}/issues?state=open&per_page=5`);
  for (const i of issues.reverse()) {
    if (state.lastIssue === i.id) continue;
    await sendDiscord(webhooks.issues, {
      color: 0xf1c40f,
      title: `✦︱Issue ${i.title}`,
      description: smpFlavor(i.user.login, 'dead'),
      url: i.html_url,
      timestamp: i.created_at
    });
    state.lastIssue = i.id;
  }

  // --- Releases ---
  const releases = await githubFetch(`${name}/releases?per_page=3`);
  for (const r of releases.reverse()) {
    if (state.lastRelease === r.id) continue;
    await sendDiscord(webhooks.release, {
      color: 0x1abc9c,
      title: `✦︱Release ${r.tag_name}`,
      description: smpFlavor(r.author.login, 'relic'),
      url: r.html_url,
      timestamp: r.published_at
    });
    state.lastRelease = r.id;
  }
}

// --- Save state ---
await saveState();
