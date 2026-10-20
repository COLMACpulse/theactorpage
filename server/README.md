# THEACTORPAGE HOST

Actors' pages, live at `<name>.theactorpage.com`. One Cloudflare Worker (`worker.js`) and one R2 bucket.
The Project Hub's **PUT IT ONLINE** panel publishes to it. Only the finished page goes up, and only when the actor taps.

- No accounts: claiming a name returns a key (kept on the phone) and a backup code (for a new phone). Only hashes are stored.
- Pages can't run scripts, send forms or be framed (strict CSP), and only page, image, video, PDF and text files are taken.
- Limits: 95 MB a file, 100 MB a page (`wrangler.toml` vars). Long video goes on YouTube or Vimeo as a link.
- Deploys from GitHub (`.github/workflows/host.yml`) when `server/` changes, once the two Cloudflare secrets are set.

Test locally: `npm install && node tests/host_tests.js` (Miniflare, Cloudflare's own runtime, with a throwaway bucket).
End to end with the Hub: `server/tests/online_e2e.js` (needs the site on :8811 and Playwright).
