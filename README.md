# BlueberryUB

BlueberryUB opens to a radial home screen with Browser and Games options. The
Browser option opens the tabbed browser at `/browser.html`.
The browser uses the official Scramjet proxy bootstrap, searches non-URL text with
DuckDuckGo, and adapts to the device viewport.

## Run locally

```sh
npm install
npm run dev
```

Open <http://localhost:3030>. The bootstrap downloads its compatible Scramjet
runtime packages on first startup, so the server needs internet access. Set
`PORT` to use a different port.

Scramjet is experimental. Some websites may not load because they block proxying,
embedded browsing, or features the browser does not support. No proxy can
guarantee that every URL works.

## Supabase accounts and history

The local Supabase URL and publishable key are read from the ignored `.env` file.
Never put a Supabase secret/service-role key in browser code.

Enable email sign-in and allow the current app origin in Authentication → URL
Configuration. Run the original profiles migration, then
`supabase/migrations/20261015000100_history_and_remove_admin.sql` in Supabase SQL
Editor. The second migration adds private browsing history and removes the unused
moderation tables.

Deploy the self-delete function:

```sh
npx supabase functions deploy delete-account --project-ref bizsbvyaktrtkitayqkm
```

Create an account at `/profile.html` to sync a display name and optionally save
history. History can be paused or cleared from Profile.

## Games

The Games view is embedded in `static/index.svg` so it renders from jsDelivr.
It lists the Seraph, CKV, Truffled, and UGS catalogs published by
[gmshelf](https://github.com/gmshelf). Catalog data loads from jsDelivr, while
selected third-party games open through Blueberry's Scramjet proxy.

Open the catalog directly at
<https://cdn.jsdelivr.net/gh/debugfr/blueberry@main/static/index.svg?view=games>.

## Deploy

Push changes to `main`. The `Purge jsDelivr cache` GitHub Actions workflow
checks and refreshes the stable jsDelivr URL after each push, every six hours,
and on manual dispatch. It compares the served SVG against GitHub's current
`main`, retries throttled purges, and verifies the CDN content before succeeding.
Open <https://cdn.jsdelivr.net/gh/debugfr/blueberry@main/static/index.svg>.

For a cache-independent, automatically deployed URL, the `Deploy static browser
to GitHub Pages` workflow publishes `static/` after changes to `main`. Open
<https://debugfr.github.io/blueberry/static/index.svg> after its first successful
deployment. Do not use the `raw.githubusercontent.com` file URL as an app host:
GitHub serves raw files with a sandbox policy that blocks the app's scripts.