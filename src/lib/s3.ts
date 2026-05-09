/**
 * S3 storage layer — drop-in replacement for the previous Supabase Storage code.
 *
 * Public API (kept compatible with old `lib/supabase/admin.ts` so the rest of
 * the app barely changes):
 *   - createSignedUrl(key, expiresIn)        → GET URL for the browser
 *   - createUploadUrl(key, contentType)      → PUT URL for the browser
 *   - downloadObject(key)                    → bytes (for OCR/watermark)
 *   - uploadObject(key, body, contentType)   → server-side upload
 *   - deleteObjects(keys)                    → bulk delete
 *   - objectExists(key)                      → HEAD check
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env";

let _client: S3Client | null = null;

function client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: env.AWS_REGION ?? "us-east-2",
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
      // AWS SDK v3.729+ adds an auto-CRC32 to PutObject by default. That
      // breaks browser-side PUTs against presigned URLs because the browser
      // can't recompute the checksum, so S3 rejects with SignatureDoesNotMatch.
      // Force it to only checksum when explicitly requested.
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

/**
 * Generate a signed GET URL for a stored object.
 * - If the input is already a full URL, returns it untouched.
 * - Returns null if S3 is not configured (so callers can no-op).
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
 * Generate a signed PUT URL the browser can upload to directly.
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
