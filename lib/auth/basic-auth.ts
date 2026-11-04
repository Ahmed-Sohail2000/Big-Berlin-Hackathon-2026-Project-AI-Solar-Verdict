// lib/auth/basic-auth.ts
// Password gate for the whole app. Fails closed: a production deployment without
// credentials configured refuses every request rather than running open.

export type AuthDecision = "allow" | "challenge" | "misconfigured";

interface AuthConfig {
  username?: string;
  password?: string;
  production: boolean;
}

async function digest(text: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

/** Compares fixed-length digests in constant time, so timing reveals nothing about the secret. */
async function secretsEqual(a: string, b: string): Promise<boolean> {
  const [left, right] = await Promise.all([digest(a), digest(b)]);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}

function parseBasicHeader(header: string | null): { username: string; password: string } | null {
  if (!header?.startsWith("Basic ")) return null;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return null;
  }
  const colon = decoded.indexOf(":");
  if (colon < 0) return null;
  return { username: decoded.slice(0, colon), password: decoded.slice(colon + 1) };
}

export async function authorize(header: string | null, config: AuthConfig): Promise<AuthDecision> {
  const { username, password, production } = config;
  if (!username || !password) return production ? "misconfigured" : "allow";

  const supplied = parseBasicHeader(header);
  if (!supplied) return "challenge";
  const [userMatches, passwordMatches] = await Promise.all([
    secretsEqual(supplied.username, username),
    secretsEqual(supplied.password, password),
  ]);
  return userMatches && passwordMatches ? "allow" : "challenge";
}
