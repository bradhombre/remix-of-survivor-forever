const PROXY_DOMAINS = ['static.wikia.nocookie.net', 'vignette.wikia.nocookie.net'];

export function getProxiedImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (PROXY_DOMAINS.includes(parsed.hostname)) {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      return `https://${projectId}.supabase.co/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // not a valid URL, return as-is
  }
  return url;
}
