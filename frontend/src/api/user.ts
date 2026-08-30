// 用户身份：登录后 token + user 存 localStorage；未登录回退本地 UUID（游客模式，向后兼容）
import type { AuthUser } from './types'

const TOKEN_KEY = 'token'
const USER_KEY = 'auth_user'
const GUEST_KEY = 'user_id'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

/** 用户标识：登录用账号 id，游客用本地 UUID（用于历史/报告按用户隔离）。 */
export function getUserId(): string {
  const user = getAuthUser()
  if (user) return String(user.id)
  let id = localStorage.getItem(GUEST_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(GUEST_KEY, id)
  }
  return id
}
