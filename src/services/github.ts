import { Settings } from './storage';

const BASE = 'https://api.github.com';

export type GitHubErrorType = 'auth' | 'not_found' | 'rate_limit' | 'server' | 'network';

export class GitHubError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
    public readonly type: GitHubErrorType,
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}

function classifyStatus(status: number): GitHubErrorType {
  if (status === 401 || status === 403) return 'auth';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limit';
  return 'server';
}

async function request<T = unknown>(
  settings: Settings,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${BASE}${path}${path.includes('?') ? '&' : '?'}t=${Date.now()}`;
  console.log(`[GitHub API Request] ${method} ${path} | Repo: ${settings.repo}`);
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${settings.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    console.log('[GitHub API Network Error]', e);
    throw new GitHubError('Нет подключения к GitHub', null, 'network');
  }

  console.log(`[GitHub API Response] ${path} Status: ${res.status}`);

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    console.log(`[GitHub API Error] ${res.status}: ${msg}`);
    throw new GitHubError(`GitHub ${res.status}: ${msg}`, res.status, classifyStatus(res.status));
  }
  const data = await res.json();
  return data as T;
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
): Promise<string> {
  const result = await request<{ commit: { sha: string } }>(
    settings, 'PUT', `/repos/${settings.repo}/contents/${path}`, {
      message: message ?? (sha ? `Update ${path}` : `Add ${path}`),
      content: toBase64(content),
      ...(sha ? { sha } : {}),
    }
  );
  return result.commit.sha;
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

interface ChangedFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
}

export async function getChangedFiles(
  settings: Settings,
  oldSha: string,
  newSha: string,
): Promise<ChangedFile[]> {
  const data = await request<{ files?: ChangedFile[] }>(
    settings, 'GET', `/repos/${settings.repo}/compare/${oldSha}...${newSha}`
  );
  return data.files ?? [];
}

export async function validateAccess(settings: Settings): Promise<void> {
  await request(settings, 'GET', `/repos/${settings.repo}`);
}
