// A Cloudflare Worker that asks GitHub to run the hiscores job every 15 minutes.
// Cloudflare's cron triggers fire on time, which GitHub's own scheduler has not been doing.
//
// Setup (about 5 minutes, free):
//   1. On GitHub: Settings → Developer settings → Fine-grained tokens → Generate. Repository
//      access: only osrs-rank1-readings. Permissions: Actions → Read and write. Copy the token.
//   2. On Cloudflare (dash.cloudflare.com, free account): Workers & Pages → Create → Worker,
//      paste this file as the code, deploy.
//   3. Worker → Settings → Variables: add a secret GITHUB_TOKEN with the token from step 1.
//   4. Worker → Settings → Triggers → Cron Triggers: add  3,18,33,48 * * * *
// Nothing else needs to change: the app already picks up every run.
export default {
  async scheduled(event, env) {
    const res = await fetch('https://api.github.com/repos/damian12000/osrs-rank1-readings/actions/workflows/snapshot.yml/dispatches', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'road-to-rank-1-cron', 'X-GitHub-Api-Version': '2022-11-28' },
      body: JSON.stringify({ ref: 'main' }),
    });
    if (res.status !== 204) console.log('dispatch failed', res.status, await res.text());
  },
  async fetch() { return new Response('Road to Rank 1 cron worker. Nothing to see here.', { status: 200 }); },
};
