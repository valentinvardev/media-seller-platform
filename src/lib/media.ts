import { getCFUrl, createSignedUrl } from "~/lib/s3";

/**
 * Resolves a display URL for a media key.
 * - CloudFront (no expiry, cacheable) when CLOUDFRONT_DOMAIN is set — production.
 * - Presigned S3 URL as fallback — dev / no CF configured.
 *
 * Do NOT use this for post-purchase original downloads; those must stay presigned.
 */
export async function resolveMediaUrl(
  key: string,
  expiresIn = 86_400,
): Promise<string | null> {
  if (!key) return null;
  return getCFUrl(key) ?? createSignedUrl(key, expiresIn);
}
