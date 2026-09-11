import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// Node ≥ 25 ships its own (file-backed, often unusable) localStorage global that shadows jsdom's.
class MemoryStorage implements Storage {
  private data = new Map<string, string>()
  get length() {
    return this.data.size
  }
  clear() {
    this.data.clear()
  }
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value))
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  if (typeof globalThis[name]?.clear !== 'function') {
    Object.defineProperty(globalThis, name, { value: new MemoryStorage(), configurable: true, writable: true })
  }
}

// Tests never touch the network: clients get fakes injected, merchant logo lookups fall back to categories.
globalThis.fetch = async () => {
  throw new TypeError('network is disabled in tests')
}
