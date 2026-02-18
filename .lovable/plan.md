

# Fix: Contestant Images Not Loading (Wikia Hotlink Protection)

## Problem
Fandom/Wikia blocks "hotlinking" -- when your app tries to load images directly from `static.wikia.nocookie.net` using `<img>` tags, the Wikia server rejects the request because it's coming from a different website. The images work fine if you paste the URL into your browser directly, but not when embedded in the app.

## Solution: Image Proxy

Create a lightweight backend function that acts as a middleman. Instead of the browser fetching images directly from Wikia, it will ask your backend to fetch the image, which then passes it through to the browser. Wikia sees the request coming from a server (not a browser on a different site) and serves the image normally.

## Implementation Steps

### 1. Create a new `image-proxy` backend function
- Accepts a `url` query parameter (the Wikia image URL)
- Fetches the image server-side (no hotlink restrictions apply)
- Returns the image bytes with proper content-type headers and caching (24h cache)
- Only allows URLs from `static.wikia.nocookie.net` for security

### 2. Add a helper function to transform image URLs
- Create a utility that wraps Wikia URLs through the proxy
- Non-Wikia URLs pass through unchanged
- Used in the `ContestantAvatar` component

### 3. Update `ContestantAvatar` component
- Apply the proxy URL transformation before rendering the `<img>` tag

## Technical Details

| File | Change |
|------|--------|
| `supabase/functions/image-proxy/index.ts` | New edge function that fetches and proxies images from allowed domains |
| `src/lib/imageProxy.ts` | New utility to transform Wikia URLs to go through the proxy |
| `src/components/ContestantAvatar.tsx` | Use the proxy utility for the image `src` |

