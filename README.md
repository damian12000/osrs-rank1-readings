# Hiscores daily readings

This folder is a small GitHub repository. Once it is on GitHub, a scheduled job reads the
Old School hiscores every 15 minutes (top 25 of every boss, plus your own kill counts) and
saves the numbers to `data/history.json`. The Rank 1 Tracker app pulls that file in, so
your charts have a reading for every day even when your PC is off.

## Setup (about 10 minutes, once)

1. Sign in at https://github.com and create a **new repository**. Name it anything
   (for example `osrs-readings`). Set it to **Public**. Do not add a README.
2. On the new repository page choose **uploading an existing file**, then drag in the
   contents of this `cloud` folder: `snapshot.mjs`, `README.md`, the `data` folder and the
   `.github` folder. Commit.
   - The `.github` folder is hidden-style (starts with a dot). If dragging it does not
     work, use **Add file → Create new file**, type the name
     `.github/workflows/snapshot.yml`, and paste in the contents of that file.
3. Open the **Actions** tab. If GitHub asks, enable workflows.
4. Click **Hiscores snapshot → Run workflow** to take the first reading now. After about
   two minutes it should show a green tick and a new commit on `data/history.json`.
5. Tell the app which repository to read: put `{"repo": "your-username/your-repo"}` in
   `data/cloud.json` in the app folder and restart it. From then on it syncs by itself.

## If GitHub's scheduler is unreliable

GitHub runs scheduled workflows on a best-effort basis and can skip slots for hours. The app
asks for a run itself whenever the last reading is stale, but only while the PC is on. For
round-the-clock coverage, `cloudflare-cron.js` is a free Cloudflare Worker that triggers the
job every 15 minutes on a timer that does fire on time; the setup steps are at the top of
that file.

## Changing the player

Edit `.github/workflows/snapshot.yml` and change the `PLAYER` line.

## Notes

- Each run overwrites the previous "Hiscores reading" commit rather than adding one, so the
  repository stays small. If you keep a local copy, update it with `git fetch` and
  `git reset --hard origin/main` instead of `git pull`.

- The repository must be public for the app to read the file without a password. It only
  contains public hiscores numbers and your player name.
- GitHub can start scheduled jobs late, sometimes by an hour or more at busy times.
- If a run shows a red cross, open it to see the error. The most likely cause is the
  hiscores site refusing requests from GitHub's servers.
