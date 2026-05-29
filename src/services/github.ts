import { Settings } from './storage';

const BASE = 'https://api.github.com';

async function request<T = unknown>(
  settings: Settings,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${settings.token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`GitHub ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

const toBase64 = (str: string): string => {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const fromBase64 = (b64: string): string => {
  const binary = atob(b64.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
};

interface GithubFile {
  content: string;
  sha: string;
}

interface GithubDirEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
}

export async function getFile(settings: Settings, path: string) {
  const data = await request<GithubFile>(settings, 'GET', `/repos/${settings.repo}/contents/${path}`);
  return {
    content: fromBase64(data.content),
    sha: data.sha,
  };
}

export async function saveFile(
  settings: Settings,
  path: string,
  content: string,
  sha: string | undefined,
  message?: string,
) {
  await request(settings, 'PUT', `/repos/${settings.repo}/contents/${path}`, {
    message: message ?? (sha ? `Update ${path}` : `Add ${path}`),
    content: toBase64(content),
    ...(sha ? { sha } : {}),
  });
}

export async function listDirectory(settings: Settings, path: string) {
  return request<GithubDirEntry[]>(settings, 'GET', `/repos/${settings.repo}/contents/${path}`);
}

export async function getLatestCommitSha(settings: Settings): Promise<string> {
  const data = await request<{ object: { sha: string } }>(
    settings, 'GET', `/repos/${settings.repo}/git/refs/heads/main`
  );
  return data.object.sha;
}

export async function validateAccess(settings: Settings): Promise<void> {
  await request(settings, 'GET', `/repos/${settings.repo}`);
}
