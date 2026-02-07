const AUTH_KEY = "auction_user";
const AUTH_EXPIRY_KEY = "auction_user_expiry";
const EXPIRY_DAYS = 30;

export interface AuthUser {
  id: string;
  real_name: string;
  nickname: string;
  phone_suffix: string;
  gender: string;
  balance: number;
  session_id?: string;
}

export function setAuth(user: AuthUser): void {
  if (typeof window === "undefined") return;
  const expiry = Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_EXPIRY_KEY, String(expiry));
}

export function getAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(AUTH_KEY);
  const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);

  if (!raw) return null;

  // 만료 체크 (expiry가 없으면 기존 유저 → 유효로 간주)
  if (expiry && Date.now() > Number(expiry)) {
    clearAuth();
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    clearAuth();
    return null;
  }
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_EXPIRY_KEY);
}
