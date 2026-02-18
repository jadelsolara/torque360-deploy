const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  firstName: string;
  lastName: string;
  iat: number;
  exp: number;
}

// In-memory access token — safe from XSS localStorage theft.
// Refresh token is stored as an httpOnly cookie by the backend.
let accessToken: string | null = null;

export function getToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function clearAuth(): void {
  accessToken = null;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getUser(): JwtPayload | null {
  const token = getToken();
  if (!token) return null;
  return decodeJwt(token);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;

  const payload = decodeJwt(token);
  if (!payload) return false;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
}

/**
 * Attempt to obtain a fresh access token using the httpOnly refresh cookie.
 * Returns true if successful, false otherwise.
 * Call this on page load to restore the session after a browser refresh.
 */
export async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      clearAuth();
      return false;
    }
    const data = await res.json();
    setAccessToken(data.accessToken);
    return true;
  } catch {
    clearAuth();
    return false;
  }
}

/**
 * Clear session on both client and server (clears httpOnly cookie).
 */
export async function logout(): Promise<void> {
  clearAuth();
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Best-effort — cookie will expire on its own
  }
}

// Back-compat: these were used by localStorage consumers; remap to new API
export function setTokens(accessToken: string, _refreshToken?: string): void {
  setAccessToken(accessToken);
}

export function clearTokens(): void {
  clearAuth();
}

export type { JwtPayload };
