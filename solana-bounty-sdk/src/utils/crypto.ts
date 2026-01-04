import crypto from "crypto";

/**
 * Create SHA256 hash of repository name (32 bytes)
 */
export function getRepositoryHash(repoFullName: string): Buffer {
  return crypto.createHash("sha256").update(repoFullName).digest();
}

/**
 * Verify GitHub webhook signature using HMAC SHA256
 */
export function verifyGitHubSignature(
  body: Buffer,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const expected = `sha256=${hmac.digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
