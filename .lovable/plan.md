## Season 51 Rollover

### What's going on
The app never automatically looked up a new cast. The official cast list only has Season 50 (24 contestants, all with photos). The existing "Fetch images" tool can only add photos to contestants that were already entered by hand. New leagues also default to Season 50.

### What to build

**1. "Import cast from wiki" button (Platform Admin > Cast)**
- Enter a season number (defaults to 51) and click Import.
- Reads the Survivor wiki season page, pulls every castaway's name, tribe, age, job and photo, and shows a preview list.
- You review and confirm before anything is saved. Re-running skips people already added.
- If the wiki page isn't filled in yet, you get a clear message and can still use the CSV or manual add.

**2. Current season setting**
- New "Current season" setting in Platform Admin > Settings (set to 51).
- New leagues default to this season, and the "Import cast" step when creating a league uses it.
- Update JeffBot so it knows the current season.

**3. Optional weekly auto-check**
- A background check once a week: if the current season has no cast yet, it runs the wiki import automatically and you'll see the cast appear in the admin panel.

### Other things to do for a new season (checklist for you)
- Existing leagues: commissioners need to archive Season 50 and start a new season (the app already supports this). I can send a JeffBot announcement in every league explaining how.
- Review the scoring templates still fit the new season's twists.
- Check the imported photos and fix any wrong matches in the Cast screen.

### Technical details
- Extend `fetch-cast-images` edge function with a `mode: "import_cast"` that returns parsed castaways (name, tribe, age, occupation, image_url) from the Castaways section via Firecrawl HTML + AI fallback, without writing; CastManager inserts after preview confirm.
- `app_settings` row `current_season` = '51'; read via `useAppSettings` in CreateLeagueDialog (replace hardcoded 50) and injected into the jeffbot system prompt.
- Weekly pg_cron job calling the function in an `auto` mode that inserts only when the season has zero rows.
- Announcement: one-time insert into `chat_messages` per league (is_bot = true), after confirmation.
