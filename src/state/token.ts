const KEY = 'monotrat.token'

function safely<T>(fn: () => T): T | null {
  try {
    return fn()
  } catch {
    return null
  }
}

export function clearToken(): void {
  safely(() => localStorage.removeItem(KEY))
  safely(() => sessionStorage.removeItem(KEY))
}

/** sessionStorage by default; localStorage only when the user asked to remember. */
export function saveToken(token: string, remember: boolean): void {
  clearToken()
  safely(() => (remember ? localStorage : sessionStorage).setItem(KEY, token))
}

export function loadToken(): { token: string; remembered: boolean } | null {
  const remembered = safely(() => localStorage.getItem(KEY))
  if (remembered) return { token: remembered, remembered: true }
  const session = safely(() => sessionStorage.getItem(KEY))
  return session ? { token: session, remembered: false } : null
}
