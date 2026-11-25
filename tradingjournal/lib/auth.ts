import 'server-only';

export function workspaceEmail(): string | null {
  if (process.env.JOURNAL_PUBLIC_ACCESS?.trim().toLowerCase() !== 'true') return null;
  return process.env.JOURNAL_USER_EMAIL?.trim() || null;
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const host = request.headers.get('host') || new URL(request.url).host;
    return parsed.host === host && (parsed.protocol === 'https:' || (parsed.protocol === 'http:' && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)));
  } catch { return false; }
}
