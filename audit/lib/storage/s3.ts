import "server-only";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Scaleway-compatible S3 client (T028).
 *
 * In production: Scaleway Object Storage (Paris region) for PDF reports,
 * funding briefs, KB attachments. Lifecycle rules mirror the retention policy
 * (FR-166). In local dev: MinIO via `infra/dev/docker-compose.yml`.
 *
 * AWS SDK v3 with `forcePathStyle: true` works against both endpoints.
 */

let _client: S3Client | null = null;
function getClient(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: process.env.S3_REGION ?? "fr-par",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
  return _client;
}

function getBucket(): string {
  return process.env.S3_BUCKET ?? "audit-reports";
}

export interface PutObjectArgs {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
}

export async function putObject(args: PutObjectArgs): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType ?? "application/octet-stream",
    }),
  );
}

/**
 * Issue a pre-signed URL for a private object. Default TTL: 5 minutes —
 * short-lived because shared report links are issued lazily per view.
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: getBucket(), Key: key }),
    { expiresIn: expiresInSeconds },
  );
}
