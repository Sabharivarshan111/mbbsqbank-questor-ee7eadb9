/** localStorage-backed stand-in for AsyncStorage v3, preview harness only. */
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memory.set(key, value);
  }
}

function drop(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    memory.delete(key);
  }
}

function allKeys(): string[] {
  try {
    return Object.keys(window.localStorage);
  } catch {
    return Array.from(memory.keys());
  }
}

const AsyncStorage = {
  async getItem(key: string) {
    return read(key);
  },
  async setItem(key: string, value: string) {
    write(key, value);
  },
  async removeItem(key: string) {
    drop(key);
  },
  async getMany(keys: string[]) {
    const out: Record<string, string | null> = {};
    for (const key of keys) {
      out[key] = read(key);
    }
    return out;
  },
  async setMany(entries: Record<string, string>) {
    for (const [key, value] of Object.entries(entries)) {
      write(key, value);
    }
  },
  async removeMany(keys: string[]) {
    for (const key of keys) {
      drop(key);
    }
  },
  async getAllKeys() {
    return allKeys();
  },
  async clear() {
    for (const key of allKeys()) {
      drop(key);
    }
  },
};

export default AsyncStorage;
