// Unsubscribe token utilities — signed JWTs so tokens can't be forged

import { createHmac } from "crypto";

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? "default-dev-secret";

export function createUnsubscribeToken(email: string): string {
  const payload = Buffer.from(JSON.stringify({ email, iat: Date.now() })).toString("base64url");
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (sign(payload) !== sig) return null;
  try {
    const { email } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof email === "string" ? email : null;
  } catch {
    return null;
  }
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}
