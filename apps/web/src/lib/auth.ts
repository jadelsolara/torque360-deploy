const ACCESS_TOKEN_KEY = 'torque_access_token';
const REFRESH_TOKEN_KEY = 'torque_refresh_token';

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

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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

export type { JwtPayload };
