

# Fix Customer.io `user_signed_up` Event Ordering and Deduplication

## Problem
1. The `trackEvent('user_signed_up')` in the `signUp` function fires **before** `identifyUser()` runs (which happens in the `onAuthStateChange` callback via `setTimeout`). Customer.io needs to know who the user is before it can attribute the event.
2. The event could also fire on regular logins since `onAuthStateChange` doesn't distinguish signups from sign-ins.

## Changes (single file: `src/hooks/useAuth.ts`)

### 1. Move `trackEvent('user_signed_up')` into the `onAuthStateChange` callback
Place it inside the `setTimeout`, right after `identifyUser()`, so identity is established first.

### 2. Only fire on new signups
Check `event === 'SIGNED_UP'` inside `onAuthStateChange` to distinguish a fresh signup from a regular `SIGNED_IN`. This is the Supabase auth event type that fires only when a new account is created.

### 3. Remove the duplicate `trackEvent` from `signUp()`
Delete the `trackEvent('user_signed_up')` call on line 112 since it will now live in the auth state listener.

### Resulting code in the `onAuthStateChange` callback

```text
setTimeout(() => {
  fetchUserData(session.user.id);
  identifyUser(
    session.user.id,
    session.user.email || '',
    session.user.created_at || new Date().toISOString()
  );
  if (event === 'SIGNED_UP') {
    trackEvent('user_signed_up');
  }
}, 0);
```

### Lines affected
| Lines | What changes |
|-------|-------------|
| 46-54 | Add `trackEvent` after `identifyUser`, guarded by `event === 'SIGNED_UP'` |
| 111-113 | Remove standalone `trackEvent('user_signed_up')` from `signUp()` |

