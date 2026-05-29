export interface Settings {
  repo: string;  // "owner/repo"
  token: string; // GitHub PAT
}

const KEY = 'bookshelf_settings';

export function getSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Settings) : null;
  } catch {
    return null;
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(KEY, JSON.stringify(settings));
}

export function clearSettings(): void {
  localStorage.removeItem(KEY);
}
