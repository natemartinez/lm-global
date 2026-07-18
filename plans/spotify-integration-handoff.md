# Spotify Integration — Handoff

## Current Approach: iframe-only

The Spotify integration uses the **Spotify Embed Iframe** for both episode browsing and playback. No server-side API proxy is needed.

### Why iframe-only?

The Spotify Web API requires the app owner's account to have a **Premium subscription** to access the shows/episodes endpoints. Since the embed iframe already provides full episode browsing and playback without any server-side code, we use it as the sole integration point.

---

## What's Implemented

### Frontend ([`index.html`](../index.html))

| Change | Details |
|---|---|
| **Broadcasts section** | Single-column layout with Spotify embed iframe panel |
| **Show cover art** | SVG gradient placeholder (`data:image/svg+xml`) with "LM" text, matching `lm-deep` aesthetic |
| **Spotify embed iframe** | Full show embed at `https://open.spotify.com/embed/show/0KdGx6bE5KpdAskhmyBy04?utm_source=generator&theme=0` |
| **"Listen on Spotify" CTA** | Button below the embed linking to the full show |
| **Light mode CSS** | Overrides for the Spotify embed panel and green CTA button |

### Files Modified

| File | Change |
|---|---|
| [`index.html`](../index.html) | Replaced two-column grid (left: episode list + right: iframe) with single-column Spotify embed panel. Removed all API-dependent JS functions (`loadSpotifyEpisodes`, `renderEpisodes`, `loadMoreEpisodes`, `toggleSort`, `applySearchAndSort`, `formatDuration`, `stripHtml`, `truncateText`, `escapeHtml`, `updateShowMetadata`). Removed stale CSS (sermon-item styles, loading skeleton, light mode overrides for removed elements). |

---

## Architecture

```
Browser ──► Cloudflare Pages (index.html)
              │
              └──► Spotify Embed Iframe (playback + browsing)
```

- **Playback**: Spotify iframe embed (no auth needed)
- **Episode browsing**: Provided natively by the Spotify embed iframe
- **No server-side code**: No Cloudflare Workers, no KV cache, no API proxy

---

## Spotify Show Details

| Property | Value |
|---|---|
| Show ID | `0KdGx6bE5KpdAskhmyBy04` |
| Embed URL | `https://open.spotify.com/embed/show/0KdGx6bE5KpdAskhmyBy04?utm_source=generator&theme=0` |
| Show URL | `https://open.spotify.com/show/0KdGx6bE5KpdAskhmyBy04` |

---

## If Web API Access is Needed in the Future

If the Spotify account is upgraded to Premium, the hybrid approach can be restored:

1. Recreate [`functions/api/spotify/_token.ts`](../functions/api/spotify/_token.ts) — OAuth token management with KV caching
2. Recreate [`functions/api/spotify/episodes.ts`](../functions/api/spotify/episodes.ts) — Episodes endpoint with pagination
3. Add `kv_namespaces` binding to [`wrangler.jsonc`](../wrangler.jsonc) for `SPOTIFY_CACHE`
4. Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` as Pages secrets
5. Restore the frontend JS functions for dynamic episode loading, search/sort, and pagination

The full implementation plan is documented in [`plans/spotify-integration-plan.md`](../plans/spotify-integration-plan.md).
