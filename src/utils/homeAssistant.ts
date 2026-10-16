// Home Assistant Utilities and Network Diagnostics

export interface ParsedHaAddress {
  host: string;
  port: number;
  useHttps: boolean;
  protocol: 'http' | 'https';
  customPath: string;
  isNabuCasa: boolean;
  isPrivateLan: boolean;
  fullUrl: string;
  apiUrl: string;
}

export interface DecodedHaToken {
  valid: boolean;
  issuer?: string;
  issuedAt?: string;
  expiresAt?: string;
  isExpired?: boolean;
  daysRemaining?: number;
}

/**
 * Checks if a hostname or IP is a local private network address (RFC 1918 or mDNS)
 */
export function isPrivateLanAddress(ipOrHost: string): boolean {
  const trimmed = (ipOrHost || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0];
  if (!trimmed) return false;
  if (trimmed === 'localhost' || trimmed === '127.0.0.1' || trimmed.endsWith('.local')) return true;
  
  const parts = trimmed.split('.').map(Number);
  if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
    if (parts[0] === 10) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  }
  return false;
}

/**
 * Robustly parses any user-entered Home Assistant address or URL
 * Handles full URLs, bare IPs, custom ports, and Nabu Casa cloud links
 */
export function parseHomeAssistantAddress(
  rawAddress: string,
  defaultPort = 8123,
  defaultHttps = false,
  defaultPath = '/lovelace'
): ParsedHaAddress {
  let str = (rawAddress || '').trim();
  let useHttps = defaultHttps;
  let customPath = defaultPath;
  let port = defaultPort;

  // 1. Detect and strip protocol
  if (str.toLowerCase().startsWith('https://')) {
    useHttps = true;
    str = str.slice(8);
  } else if (str.toLowerCase().startsWith('http://')) {
    useHttps = false;
    str = str.slice(7);
  }

  // 2. Extract path (e.g. /dashboard-home/0 or /lovelace)
  const slashIdx = str.indexOf('/');
  if (slashIdx !== -1) {
    const extractedPath = str.slice(slashIdx);
    if (extractedPath && extractedPath !== '/') {
      customPath = extractedPath;
    }
    str = str.slice(0, slashIdx);
  }

  // 3. Detect Home Assistant Cloud (Nabu Casa: *.ui.nabu.casa)
  const isNabuCasa = str.toLowerCase().includes('.ui.nabu.casa');
  if (isNabuCasa) {
    useHttps = true;
    port = 443;
  }

  // 4. Extract port if embedded (e.g. 192.168.7.236:8123)
  const colonIdx = str.lastIndexOf(':');
  if (colonIdx !== -1 && !str.includes(']')) {
    const portPart = parseInt(str.slice(colonIdx + 1), 10);
    if (!isNaN(portPart) && portPart > 0) {
      port = portPart;
      str = str.slice(0, colonIdx);
    }
  }

  const host = str.trim() || '192.168.1.100';
  const isPrivateLan = isPrivateLanAddress(host);
  const protocol = useHttps ? 'https' : 'http';
  const portSuffix = (useHttps && port === 443) || (!useHttps && port === 80) ? '' : `:${port}`;
  const fullUrl = `${protocol}://${host}${portSuffix}${customPath.startsWith('/') ? customPath : `/${customPath}`}`;
  const apiUrl = `${protocol}://${host}${portSuffix}/api/`;

  return {
    host,
    port,
    useHttps,
    protocol,
    customPath,
    isNabuCasa,
    isPrivateLan,
    fullUrl,
    apiUrl,
  };
}

/**
 * Decodes and validates a Home Assistant Long-Lived Access Token without external dependencies
 */
export function decodeHaToken(token: string): DecodedHaToken {
  if (!token || typeof token !== 'string') {
    return { valid: false };
  }
  const clean = token.trim();
  const parts = clean.split('.');
  if (parts.length !== 3) {
    return { valid: false };
  }

  try {
    // Decode base64url payload
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonStr);

    const exp = payload.exp ? payload.exp * 1000 : null;
    const now = Date.now();
    const isExpired = exp ? now > exp : false;
    const daysRemaining = exp ? Math.max(0, Math.round((exp - now) / (1000 * 60 * 60 * 24))) : undefined;

    return {
      valid: true,
      issuer: payload.iss || 'Home Assistant',
      issuedAt: payload.iat ? new Date(payload.iat * 1000).toLocaleDateString() : undefined,
      expiresAt: exp ? new Date(exp).toLocaleDateString() : 'Never',
      isExpired,
      daysRemaining,
    };
  } catch {
    return { valid: false };
  }
}
