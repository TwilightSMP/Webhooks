import fetch from 'node-fetch';
import fs from 'fs-extra';

export async function githubFetch(path, token) {
  const res = await fetch(`https://api.github.com/repos/${path}`, {
    headers: { Authorization: `token ${token}` }
  });
  return res.json();
}

export async function sendDiscord(webhook, embed) {
  await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] })
  });
}

export async function readState(file) {
  if (await fs.pathExists(file)) return fs.readJson(file);
  return {};
}

export async function writeState(file, data) {
  await fs.outputJson(file, data);
}

export function smpEmbed(title, description, url, color, timestamp) {
  return {
    title: `✦︱${title}`,
    description,
    url,
    color,
    timestamp
  };
}
