/**
 * S3 + CloudFront storage layer.
 *
 * Public API:
 *   - createSignedUrl(key, expiresIn)        → presigned GET URL (originals / post-purchase)
 *   - createUploadUrl(key, contentType)      → presigned PUT URL for browser uploads
 *   - downloadObject(key)                    → bytes (for OCR/watermark server-side)
 *   - uploadObject(key, body, contentType)   → server-side upload
 *   - deleteObjects(keys)                    → bulk delete
 *   - objectExists(key)                      → HEAD check
 *   - getCFUrl(key)                          → CloudFront URL if configured, else null
 *   - createCFInvalidation(paths)            → invalidate CF cache for given paths
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import { env } from "~/env";

// ── S3 client ─────────────────────────────────────────────────────────────────

let _client: S3Client | null = null;

function client(): S3Client {
  if (!_client) {
    // Prefer the S3-specific region override so the bucket can live in a
    // different AWS region than Rekognition / other services.
    const region = env.AWS_S3_REGION ?? env.AWS_REGION ?? "us-east-2";
    _client = new S3Client({
      region,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
      // Disable auto-CRC32 on PutObject — it adds x-amz-checksum-crc32=AAAAAA==
      // to presigned URLs that the browser can't recompute, causing 403
      // SignatureDoesNotMatch on direct uploads from the client.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
  }
  return _client;
}

const BUCKET = () => env.AWS_S3_BUCKET ?? "";

/** Optional folder prefix (e.g. "altafoto") so multiple deployments can share a bucket. */
const PREFIX = env.AWS_S3_PREFIX ? env.AWS_S3_PREFIX.replace(/\/?$/, "/") : "";

/** Apply prefix to a relative path. Already-prefixed/full URLs pass through. */
function withPrefix(key: string): string {
  if (key.startsWith("http")) return key;
  if (PREFIX && key.startsWith(PREFIX)) return key;
  return `${PREFIX}${key}`;
}

// ── CloudFront client ─────────────────────────────────────────────────────────

const _cfClient = env.CLOUDFRONT_DISTRIBUTION_ID
  ? new CloudFrontClient({
      region: "us-east-1", // CloudFront is always us-east-1
      credentials:
        env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
          ? { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY }
          : undefined,
    })
  : null;

/**
 * Returns a CloudFront URL for the given S3 key, or null if CF is not configured.
 * Applies the same PREFIX so keys match the S3 object paths under the distribution.
 */
export function getCFUrl(key: string): string | null {
  if (!env.CLOUDFRONT_DOMAIN || !key) return null;
  if (key.startsWith("http")) return key;
  return `https://${env.CLOUDFRONT_DOMAIN}/${withPrefix(key)}`;
}

/**
 * Invalidates CloudFront cache for the given paths (must start with "/").
 * Use wildcards for bulk: ["/previews/*"].  First 1,000 paths/month are free.
 * No-op if CF is not configured or paths is empty.
 */
export async function createCFInvalidation(paths: string[]): Promise<void> {
  if (!_cfClient || !env.CLOUDFRONT_DISTRIBUTION_ID || paths.length === 0) return;
  try {
    await _cfClient.send(
      new CreateInvalidationCommand({
        DistributionId: env.CLOUDFRONT_DISTRIBUTION_ID,
        InvalidationBatch: {
          CallerReference: Date.now().toString(),
          Paths: { Quantity: paths.length, Items: paths },
        },
      }),
    );
  } catch (err) {
    console.error("[cloudfront] invalidation failed:", err);
  }
}

// ── S3 helpers ────────────────────────────────────────────────────────────────

/**
 * Generate a presigned GET URL — use for post-purchase original downloads only.
 * For preview/display media use resolveMediaUrl() from ~/lib/media instead.
 */
export async function createSignedUrl(
  storageKey: string,
  expiresIn: number,
): Promise<string | null> {
  if (!storageKey) return null;
  if (storageKey.startsWith("http")) return storageKey;
  if (!BUCKET()) return null;

  const cmd = new GetObjectCommand({ Bucket: BUCKET(), Key: withPrefix(storageKey) });
  return getSignedUrl(client(), cmd, { expiresIn });
}

/**
 * Generate a presigned PUT URL the browser can upload to directly.
 * IMPORTANT: the client MUST send the same Content-Type header as `contentType`,
 * otherwise S3 rejects with 403 SignatureDoesNotMatch.
 */
export async function createUploadUrl(
  path: string,
  contentType: string,
  expiresIn = 300,
): Promise<{ signedUrl: string; path: string }> {
  const key = withPrefix(path);
  const cmd = new PutObjectCommand({
    Bucket: BUCKET(),
    Key: key,
    ContentType: contentType,
  });
  const signedUrl = await getSignedUrl(client(), cmd, { expiresIn });
  return { signedUrl, path };
}

/** Server-side download. Returns the object body as a Buffer. */
export async function downloadObject(storageKey: string): Promise<Buffer> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET(), Key: withPrefix(storageKey) });
  const res = await client().send(cmd);
  const chunks: Buffer[] = [];
  for await (const chunk of res.Body as AsyncIterable<Buffer>) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Server-side upload. */
export async function uploadObject(
  storageKey: string,
  body: Buffer | Uint8Array,
  contentType: string,
  cacheControl?: string,
): Promise<void> {
  await client().send(
    new PutObjectCommand({
      Bucket: BUCKET(),
      Key: withPrefix(storageKey),
      Body: body,
      ContentType: contentType,
      ...(cacheControl ? { CacheControl: cacheControl } : {}),
    }),
  );
}

/** Bulk delete. Skips http(s) entries (those aren't S3 objects). */
export async function deleteObjects(keys: string[]): Promise<void> {
  const targets = keys.filter((k) => k && !k.startsWith("http"));
  if (targets.length === 0) return;
  await Promise.all(
    targets.map((k) =>
      client().send(new DeleteObjectCommand({ Bucket: BUCKET(), Key: withPrefix(k) })),
    ),
  );
}

/** True if the object exists. False on any S3 error (including 404). */
export async function objectExists(storageKey: string): Promise<boolean> {
  try {
    await client().send(new HeadObjectCommand({ Bucket: BUCKET(), Key: withPrefix(storageKey) }));
    return true;
  } catch {
    return false;
  }
}

/** True if S3 has the env vars to operate. Useful for "is configured" checks. */
export function isS3Configured(): boolean {
  return Boolean(BUCKET() && env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);
}
