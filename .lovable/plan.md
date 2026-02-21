
# Track Account Deletion in Customer.io

## What's Missing
When a user deletes their account, Customer.io is never notified. The user remains as an active contact and could keep receiving emails.

## Changes

### 1. Fire `user_deleted_account` event before deletion (`src/pages/Leagues.tsx`)
In `handleDeleteAccount`, call `trackEvent('user_deleted_account')` **before** the edge function call. This way the user is still identified in Customer.io when the event fires.

### 2. Suppress the user in Customer.io via the edge function (`supabase/functions/delete-my-account/index.ts`)
After deleting the user from auth, call the Customer.io Track API to delete the person:
```
DELETE https://track.customer.io/api/v1/customers/{user_id}
```
This uses Basic auth with the Site ID + API Key. We'll need the **Customer.io Track API Key** stored as a secret (the Site ID is already in the HTML snippet: `87d8fe6f98e8d1f436f8`).

### 3. Add `CUSTOMERIO_API_KEY` secret
The edge function needs the Customer.io Track API key to authenticate the delete call. We'll prompt for this secret.

## Technical Details

### Client-side (`src/pages/Leagues.tsx`)
Add before the fetch call in `handleDeleteAccount`:
```typescript
trackEvent('user_deleted_account');
```

### Server-side (`supabase/functions/delete-my-account/index.ts`)
After the `auth.admin.deleteUser` call, add:
```typescript
const CIO_SITE_ID = Deno.env.get("CUSTOMERIO_SITE_ID");
const CIO_API_KEY = Deno.env.get("CUSTOMERIO_API_KEY");
if (CIO_SITE_ID && CIO_API_KEY) {
  await fetch(`https://track.customer.io/api/v1/customers/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: "Basic " + btoa(`${CIO_SITE_ID}:${CIO_API_KEY}`),
    },
  });
}
```
This removes the person from Customer.io so they won't receive future communications.

### Secrets needed
| Secret | Value |
|--------|-------|
| `CUSTOMERIO_SITE_ID` | `87d8fe6f98e8d1f436f8` (from index.html snippet) |
| `CUSTOMERIO_API_KEY` | Your Customer.io Track API Key (found in Customer.io Settings > API Credentials) |

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Leagues.tsx` | Add `trackEvent('user_deleted_account')` before the delete API call |
| `supabase/functions/delete-my-account/index.ts` | Add Customer.io person deletion after auth user deletion |
