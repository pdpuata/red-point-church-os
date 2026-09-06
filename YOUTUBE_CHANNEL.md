# Red Point Church YouTube integration

Production sermon sync is configured for the existing Red Point Church YouTube channel.

- Channel handle: `@redpointchurch`
- Channel ID: `UCEN1U4zn9RnvEkykRrerg5Q`
- API secret: stored in Supabase as `YOUTUBE_API_KEY` (never place it in the mobile app or source control).

The Edge Function resolves the channel by its immutable channel ID, obtains the channel's uploads playlist through YouTube Data API v3, and imports video metadata into the Supabase `sermons` table.
