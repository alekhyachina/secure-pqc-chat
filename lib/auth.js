import jwt from 'jsonwebtoken';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'Please define the JWT_SECRET environment variable inside .env.local'
    );
  }
  return secret;
}

/**
 * Verifies a JWT and returns its payload, or null if missing/invalid.
 */
export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the session token from an API request
 * (token cookie or Authorization: Bearer header).
 * Returns the JWT payload ({ id, username }) or null.
 */
export function getAuthenticatedUser(req) {
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  const cookie = req.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('token='))
    ?.slice('token='.length);
  return verifyToken(bearer || cookie);
}
