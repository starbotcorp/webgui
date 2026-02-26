/**
 * Shared console hosts configuration
 * Eliminates DRY violation between proxy.ts and login/page.tsx
 */

export function getConsoleHosts(): Set<string> {
  const configured = String(
    process.env.ADMIN_CONSOLE_HOSTS ||
    process.env.NEXT_PUBLIC_ADMIN_CONSOLE_HOSTS || ''
  )
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (configured.length > 0) {
    return new Set(configured);
  }

  // Default fallback - configurable via env
  const defaultHosts = process.env.NEXT_PUBLIC_DEFAULT_CONSOLE_HOSTS
    ? process.env.NEXT_PUBLIC_DEFAULT_CONSOLE_HOSTS.split(',').map(h => h.trim())
    : ['console.starbot.cloud', 'www.console.starbot.cloud'];

  return new Set(defaultHosts);
}

export function isConsoleHost(hostname: string): boolean {
  return getConsoleHosts().has(hostname.toLowerCase());
}
