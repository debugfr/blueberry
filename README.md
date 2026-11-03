# BlueberryUB

BlueberryUB opens to a radial home screen with Browser and Apps options. The
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

## Static app settings

The static app's Settings menu includes General (English and Spanish for the
home screen and settings), Privacy, Proxy, and About pages. The privacy page
explains that the app does not disguise destination websites and that session
history does not conceal activity from sites, proxy providers, or network
administrators. About lists the app version and upstream project credits.
The static app tab is titled BlueberryUB and uses `logo/blueub.png` for its
favicon and app branding.

## Apps

The Apps view in `static/index.svg` displays the 12 supplied logos in a
responsive grid with up to six apps per row. Selecting a logo opens that site
in the built-in browser. The tab strip supports up to 15 tabs and shrinks tabs
as needed; the static browser does not include bookmarks.

The app logos are stored in `apps/logos/` and are referenced relative to the
static app so they work from the versioned jsDelivr URL.

## Deploy

Push changes to `main`, then purge the jsDelivr cache at
<https://purge.jsdelivr.net/gh/debugfr/blueberry@main/static/index.svg>.
Open <https://cdn.jsdelivr.net/gh/debugfr/blueberry@main/static/index.svg>.
The `Purge jsDelivr cache` GitHub Actions workflow also checks and refreshes the
stable URL after each push, every six hours, and on manual dispatch. It compares
the served SVG against GitHub's current `main`, retries throttled purges, and
verifies the CDN content before succeeding.

For a cache-independent, automatically deployed URL, the `Deploy static browser
to GitHub Pages` workflow publishes `static/` after changes to `main`. Open
<https://debugfr.github.io/blueberry/static/index.svg> after its first successful
deployment. Do not use the `raw.githubusercontent.com` file URL as an app host:
GitHub serves raw files with a sandbox policy that blocks the app's scripts.