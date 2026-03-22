import { handlePush } from './events/push.js';
import { handlePR } from './events/pull_request.js';
import { handleIssues } from './events/issues.js';
import { handleRelease } from './events/release.js';
import { config } from './config.js';

const token = process.env.TWILIGHT_TOKEN;
const repo = process.env.GITHUB_ORG;

const webhooks = {
  push: process.env.DISCORD_WEBHOOK_PUSH,
  pr: process.env.DISCORD_WEBHOOK_PR,
  issues: process.env.DISCORD_WEBHOOK_ISSUES,
  release: process.env.DISCORD_WEBHOOK_RELEASE
};

// For simplicity, fetch all repos in org
import fetch from 'node-fetch';
const reposRes = await fetch(`https://api.github.com/orgs/${repo}/repos`, {
  headers: { Authorization: `token ${token}` }
});
const repos = await reposRes.json();

for (const r of repos) {
  const name = r.name;
  await handlePush(name, webhooks.push, token);
  await handlePR(name, webhooks.pr, token);
  await handleIssues(name, webhooks.issues, token);
  await handleRelease(name, webhooks.release, token);
}
