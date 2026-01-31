
# Fix Authentication Race Condition on Leagues Page

## Problem
When navigating to the `/leagues` page, users are incorrectly redirected to `/auth` even when they are logged in. This happens because:

1. The `Leagues.tsx` page checks `if (!user)` and redirects to `/auth`
2. But it doesn't wait for the authentication state to finish loading
3. When `useAuth` initializes, `user` is `null` and `loading` is `true`
4. The page sees `!user` and redirects before the session is retrieved

## Solution
Update `Leagues.tsx` to:
1. Destructure the `loading` state from `useAuth` (rename it to avoid conflict with local state)
2. Wait for auth loading to complete before making redirect decisions
3. Only redirect to `/auth` if auth has finished loading AND there's no user

## Change Summary

| File | Change |
|------|--------|
| `src/pages/Leagues.tsx` | Add auth loading check before redirect |

## Technical Details

**Current code (lines 28-37):**
```tsx
const { user, signOut } = useAuth();
const navigate = useNavigate();

useEffect(() => {
  if (!user) {
    navigate('/auth');
    return;
  }
  fetchMemberships();
}, [user, navigate]);
```

**Updated code:**
```tsx
const { user, signOut, loading: authLoading } = useAuth();
const navigate = useNavigate();

useEffect(() => {
  // Wait for auth to finish loading before making decisions
  if (authLoading) return;
  
  if (!user) {
    navigate('/auth');
    return;
  }
  fetchMemberships();
}, [user, authLoading, navigate]);
```

**Also update the loading state check (line 110):**
```tsx
// Current
if (loading) {

// Updated - show loading if either auth or memberships are loading
if (authLoading || loading) {
```

## Why This Works
- `authLoading` starts as `true` when `useAuth` initializes
- The useEffect exits early while `authLoading` is true, preventing premature redirect
- Once auth finishes loading, if there's a valid session, `user` will be populated
- The redirect only happens when we're certain there's no authenticated user
