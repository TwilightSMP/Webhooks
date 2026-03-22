import { handlePush } from './events/push.js';
import { handlePR } from './events/pull_request.js';
import { handleIssues } from './events/issues.js';
import { handleRelease } from './events/release.js';
import fetch from 'node-fetch';

// -----------------
// Environment Checks
// -----------------
const token = process.env.TWILIGHT_TOKEN;
const org = process.env.GITHUB_ORG;
const webhooks = {
  push: process.env.DISCORD_WEBHOOK_PUSH,
  pr: process.env.DISCORD_WEBHOOK_PR,
  issues: process.env.DISCORD_WEBHOOK_ISSUES,
  release: process.env.DISCORD_WEBHOOK_RELEASE
};

if (!token || !org || !webhooks.push || !webhooks.pr || !webhooks.issues || !webhooks.release) {
  console.error('Error: One or more required environment variables are missing.');
  process.exit(1);
}

// -----------------
// Fetch Repos with Error Handling
// -----------------
let repos;
try {
  const reposRes = await fetch(`https://api.github.com/orgs/${org}/repos`, {
    headers: { Authorization: `token ${token}` }
  });

  if (!reposRes.ok) {
    throw new Error(`GitHub API error: ${reposRes.status} ${reposRes.statusText}`);
  }

  repos = await reposRes.json();
} catch (err) {
  console.error('Failed to fetch repositories:', err);
  process.exit(1);
}

// -----------------
// Process Each Repo
// -----------------
for (const r of repos) {
  const name = r.name;

  try {
    await handlePush(name, webhooks.push, token);
  } catch (err) {
    console.error(`Push handler failed for repo ${name}:`, err);
  }

  try {
    await handlePR(name, webhooks.pr, token);
  } catch (err) {
    console.error(`PR handler failed for repo ${name}:`, err);
  }

  try {
    await handleIssues(name, webhooks.issues, token);
  } catch (err) {
    console.error(`Issues handler failed for repo ${name}:`, err);
  }

  try {
    await handleRelease(name, webhooks.release, token);
  } catch (err) {
    console.error(`Release handler failed for repo ${name}:`, err);
  }
}

console.log('✅ All repositories processed successfully.');
