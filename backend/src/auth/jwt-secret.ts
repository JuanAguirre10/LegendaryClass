/**
 * Resolves the JWT secret from the environment, failing fast if it is missing.
 *
 * Using a hardcoded fallback secret means that if `JWT_SECRET` is ever absent
 * in production, every token would be signed with a public, well-known value —
 * letting anyone forge valid tokens. We refuse to start instead.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error(
      'JWT_SECRET is not set. Define it in your environment before starting the app.',
    );
  }
  return secret;
}
