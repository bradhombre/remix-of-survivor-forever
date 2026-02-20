
# Fix Home Screen Icon (iPhone + Android)

## Problem
When saving the app to a phone's home screen, there's no proper icon. On iPhone it shows just the letter "S." Android would have a similar issue.

## Changes

### 1. Update `index.html`
Add these tags inside `<head>`:
- `<link rel="apple-touch-icon" href="/logo.png">` -- iPhone home screen icon
- `<link rel="manifest" href="/manifest.json">` -- Android + browser PWA support
- `<meta name="apple-mobile-web-app-capable" content="yes">` -- full-screen on iPhone
- `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">` -- dark status bar
- `<meta name="apple-mobile-web-app-title" content="Survivors Ready">` -- name under icon
- `<meta name="theme-color" content="#1a1a2e">` -- browser toolbar color on Android

### 2. Create `public/manifest.json` (new file)
Standard web app manifest with:
- App name: "Survivors Ready"
- Short name: "Survivors"
- Icons referencing the existing `logo.png` (192x192 and 512x512 entries)
- Display: "standalone" (opens like a native app)
- Theme and background colors matching the app

### Files
| File | Change |
|------|--------|
| `index.html` | Add icon, manifest, and mobile meta tags |
| `public/manifest.json` | New file -- web app manifest |

### Note
The existing `logo.png` is used for icons. If it appears blurry on high-res screens, we can generate properly sized icon files (192px and 512px) later.
