

# Fix Google OAuth for Lovable Cloud

## Problem Identified

The "Continue with Google" button is failing because the current implementation uses the Supabase auth client directly (`supabase.auth.signInWithOAuth`), but this project runs on **Lovable Cloud**, which requires the managed OAuth solution.

The auth logs show:
- The redirect to Google happens (status 302)
- But after returning from Google, the session is not found (`session_not_found` error)

This is because Lovable Cloud handles OAuth differently and requires using the `lovable.auth.signInWithOAuth()` function from the managed integration.

---

## Solution

### Step 1: Configure Social Auth

Run the `supabase--configure-social-auth` tool to generate the Lovable Cloud auth module. This will:
- Create `src/integrations/lovable/index.ts` 
- Install the `@lovable.dev/cloud-auth-js` package
- Set up the managed Google OAuth flow

### Step 2: Update useAuth.ts

Modify the `signInWithGoogle` function to use the Lovable managed auth:

```typescript
// Before (broken):
import { supabase } from '@/integrations/supabase/client';

const signInWithGoogle = async (redirectUrl?: string) => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl || `${window.location.origin}/leagues`
    }
  });
  return { error };
};

// After (working):
import { lovable } from '@/integrations/lovable/index';

const signInWithGoogle = async (redirectUrl?: string) => {
  const { error } = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: redirectUrl || `${window.location.origin}/leagues`
  });
  return { error };
};
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useAuth.ts` | Update `signInWithGoogle` to use `lovable.auth.signInWithOAuth` |

## New Files Created (by tool)

| File | Purpose |
|------|---------|
| `src/integrations/lovable/index.ts` | Lovable Cloud auth module (auto-generated) |

---

## Technical Notes

- The Lovable Cloud managed OAuth handles all the token exchange and session management automatically
- No API keys or secrets are required from the user - it's fully managed
- The redirect URL pattern remains the same: `window.location.origin` + desired path
- The `returnTo` parameter logic in `Auth.tsx` will continue to work unchanged

