# BlueberryUB

BlueberryUB opens to a four-option radial home screen. The Browser option opens the
tabbed browser at `/browser.html`; the other options are placeholders for now.
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
history. History can be paused or cleared from Profile. Game-state syncing can be
added once BlueberryUB has games.