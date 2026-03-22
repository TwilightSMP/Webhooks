import fetch from 'node-fetch';
import fs from 'fs-extra';
import path from 'path';
import { GITHUB_API, SMP_ROLES, SMP_FLAVOR } from './config.js';

export async function githubFetch(apiPath, token) {
  const url = `${GITHUB_API}${apiPath}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} on ${apiPath}: ${await res.text()}`);
  }

  return res.json();
}

export async function sendDiscord(webhookUrl, embed) {
  console.log(`[Discord] Sending to webhook: ${webhookUrl.slice(0, 60)}...`);
  console.log(`[Discord] Embed: ${JSON.stringify(embed, null, 2)}`);

  const payload = { embeds: [embed] };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Discord webhook ${res.status}: ${body}`);
  }

  console.log(`[Discord] Sent successfully (status ${res.status})`);
}

export async function readState(filePath) {
  try {
    const abs = path.resolve(filePath);
    await fs.ensureFile(abs);
    const raw = await fs.readFile(abs, 'utf8');
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function writeState(filePath, data) {
  const abs = path.resolve(filePath);
  await fs.ensureFile(abs);
  await fs.writeFile(abs, JSON.stringify(data, null, 2), 'utf8');
}

export function smpEmbed(title, description, url, color, timestamp) {
  const role = SMP_ROLES[Math.floor(Math.random() * SMP_ROLES.length)];
  const flavor = SMP_FLAVOR[Math.floor(Math.random() * SMP_FLAVOR.length)];

  return {
    title: `✦︱${title}`,
    description,
    url,
    color,
    timestamp: timestamp || new Date().toISOString(),
    footer: {
      text: `TwilightSMP · ${role} · ${flavor}`,
    },
  };
}

export function randomRole() {
  return SMP_ROLES[Math.floor(Math.random() * SMP_ROLES.length)];
}
