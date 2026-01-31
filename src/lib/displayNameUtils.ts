/**
 * Get display name with fallback to email username
 */
export function getDisplayName(displayName: string | null | undefined, email: string): string {
  const trimmed = displayName?.trim();
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }
  return email.split("@")[0];
}
