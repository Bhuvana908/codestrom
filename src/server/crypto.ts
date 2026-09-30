/**
 * Cryptographic operations: SHA-256 hash-chaining, password hashing, and HMAC tokens.
 * Complies with the tamper-evident append-only ledger specification.
 */

import crypto from "node:crypto";

export const GENESIS = "GENESIS";
export const SECRET_KEY = process.env.SECRET_KEY || "self-healing-kb-secure-signing-key-2026-production";
export const COOKIE_NAME = "session";

/**
 * Computes canonical SHA-256 hash for document versions:
 * hash = SHA-256(prev_hash | doc_id | version_no | text | author | reason | lineage | ts)
 */
export function computeVersionHash(
  prevHash: string,
  docId: string,
  versionNo: number,
  text: string,
  author: string,
  reason: string,
  lineage: Record<string, unknown>,
  ts: string
): string {
  const lineageStr = JSON.stringify(lineage, Object.keys(lineage).sort());
  const payload = [prevHash, docId, String(versionNo), text, author, reason, lineageStr, ts].join("|");
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Computes canonical SHA-256 hash for audit events:
 * hash = SHA-256(prev_hash | ts | actor | action | target | detail)
 */
export function computeAuditHash(
  prevHash: string,
  ts: string,
  actor: string,
  action: string,
  target: string,
  detail: Record<string, unknown>
): string {
  const detailStr = JSON.stringify(detail, Object.keys(detail).sort());
  const payload = [prevHash, ts, actor, action, target, detailStr].join("|");
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * Hash a password using PBKDF2 with SHA-256.
 */
export function hashPassword(password: string): { pw_hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, "sha256").toString("hex");
  return { pw_hash: hash, salt };
}

/**
 * Verify a password against salt and stored hash.
 */
export function verifyPassword(password: string, pwHash: string, salt: string): boolean {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(pwHash, "hex"));
}

/**
 * Creates an HMAC signed session token: username.role.exp.signature
 */
export function createSessionToken(username: string, role: string, hours = 24): string {
  const exp = Math.floor(Date.now() / 1000) + hours * 3600;
  const payload = `${username}.${role}.${exp}`;
  const sig = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/**
 * Verifies a session token. Returns { username, role } or null.
 */
export function verifySessionToken(token: string): { username: string; role: "viewer" | "reviewer" | "admin" } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [username, role, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || exp < Math.floor(Date.now() / 1000)) return null;

  const payload = `${username}.${role}.${expStr}`;
  const expectedSig = crypto.createHmac("sha256", SECRET_KEY).update(payload).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) {
    return null;
  }
  return { username, role: role as "viewer" | "reviewer" | "admin" };
}
