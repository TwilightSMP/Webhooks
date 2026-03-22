import { githubFetch, sendDiscord, smpEmbed } from './utils.js';
import { handlePush } from './events/push.js';
import { handlePullRequest } from './events/pull_request.js';
import { handleIssues } from './events/issues.js';
import { handleRelease } from './events/release.js';
import { ORG, COLORS, HEARTBEAT_ENABLED } from './config.js';

const REQUIRED_ENV = [
  'TWILIGHT_TOKEN',
  'DISCORD_WEBHOOK_PUSH',
  'DISCORD_WEBHOOK_PR',
  'DISCORD_WEBHOOK_ISSUES',
  'DISCORD_WEBHOOK_RELEASE',
];

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[Orchestrator] Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }
  console.log('[Orchestrator] All required environment variables present');
}

async function fetchOrgRepos(token) {
  console.log(`[Orchestrator] Fetching repositories for org: ${ORG}`);
  const repos = await githubFetch(`/orgs/${ORG}/repos?per_page=100&type=all`, token);
  console.log(`[Orchestrator] Found ${repos.length} repositories`);
  return repos;
}

async function sendHeartbeat(token) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_PUSH;
  if (!webhookUrl) return;

  try {
    let repoCount = 0;
    try {
      const repos = await githubFetch(`/orgs/${ORG}/repos?per_page=1`, token);
      repoCount = repos.length;
    } catch {}

    const embed = smpEmbed(
      'Orchestrator Heartbeat',
      `The TwilightSMP watcher is **active** and scanning all repositories.\n_The realm is being observed._`,
      `https://github.com/${ORG}`,
      COLORS.heartbeat,
      new Date().toISOString()
    );

    embed.fields = [
      { name: 'Organization', value: ORG, inline: true },
      { name: 'Status', value: '🟢 Online', inline: true },
      { name: 'Run Time', value: new Date().toUTCString(), inline: false },
    ];

    console.log('[Heartbeat] Sending heartbeat to Discord...');
    await sendDiscord(webhookUrl, embed);
  } catch (err) {
    console.warn(`[Heartbeat] Failed to send heartbeat: ${err.message}`);
  }
}

async function processRepo(repo, token, webhooks) {
  const repoName = repo.full_name;
  console.log(`\n[Orchestrator] ── Processing: ${repoName} ──`);

  await Promise.allSettled([
    (async () => {
      try {
        await handlePush(repo, token, webhooks.push);
      } catch (err) {
        console.error(`[Push] Unhandled error in ${repoName}: ${err.message}`);
      }
    })(),

    (async () => {
      try {
        await handlePullRequest(repo, token, webhooks.pr);
      } catch (err) {
        console.error(`[PR] Unhandled error in ${repoName}: ${err.message}`);
      }
    })(),

    (async () => {
      try {
        await handleIssues(repo, token, webhooks.issues);
      } catch (err) {
        console.error(`[Issues] Unhandled error in ${repoName}: ${err.message}`);
      }
    })(),

    (async () => {
      try {
        await handleRelease(repo, token, webhooks.release);
      } catch (err) {
        console.error(`[Release] Unhandled error in ${repoName}: ${err.message}`);
      }
    })(),
  ]);
}

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   TwilightSMP Discord Orchestrator       ║');
  console.log('╚══════════════════════════════════════════╝\n');

  validateEnv();

  const token = process.env.TWILIGHT_TOKEN;
  const webhooks = {
    push: process.env.DISCORD_WEBHOOK_PUSH,
    pr: process.env.DISCORD_WEBHOOK_PR,
    issues: process.env.DISCORD_WEBHOOK_ISSUES,
    release: process.env.DISCORD_WEBHOOK_RELEASE,
  };

  if (HEARTBEAT_ENABLED) {
    await sendHeartbeat(token);
  }

  let repos;
  try {
    repos = await fetchOrgRepos(token);
  } catch (err) {
    console.error(`[Orchestrator] Failed to fetch org repos: ${err.message}`);
    process.exit(1);
  }

  for (const repo of repos) {
    await processRepo(repo, token, webhooks);
  }

  console.log('\n[Orchestrator] ✦ All repositories processed. The realm is updated.\n');
}

main().catch((err) => {
  console.error('[Orchestrator] Fatal error:', err);
  process.exit(1);
});
