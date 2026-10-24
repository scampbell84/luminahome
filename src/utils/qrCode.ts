import QRCode from 'qrcode';

/**
 * Format string for standard Wi-Fi QR codes:
 * WIFI:T:WPA;S:MyNetwork;P:MyPassword;;
 * Special characters in SSID and password are escaped with backslash.
 */
export function formatWifiQrString(
  ssid: string,
  password: string,
  security: 'WPA' | 'WEP' | 'nopass' = 'WPA',
  hidden = false
): string {
  const escapeStr = (val: string) =>
    val.replace(/\\/g, '\\\\')
       .replace(/;/g, '\\;')
       .replace(/,/g, '\\,')
       .replace(/:/g, '\\:')
       .replace(/"/g, '\\"');

  const sec = security || 'WPA';
  const cleanSsid = escapeStr(ssid || '');
  const cleanPass = sec === 'nopass' ? '' : escapeStr(password || '');
  const h = hidden ? 'H:true;' : '';

  return `WIFI:T:${sec};S:${cleanSsid};P:${cleanPass};${h};`;
}

/**
 * Generates an SVG Data URL string for high-contrast, scalable QR codes.
 */
export async function generateQrDataUrl(
  content: string,
  options?: {
    darkColor?: string;
    lightColor?: string;
    width?: number;
    margin?: number;
  }
): Promise<string> {
  if (!content) return '';

  const opts = {
    errorCorrectionLevel: 'M' as const,
    type: 'image/svg+xml' as const,
    margin: options?.margin ?? 2,
    width: options?.width ?? 280,
    color: {
      dark: options?.darkColor || '#000000',
      light: options?.lightColor || '#ffffff',
    },
  };

  try {
    const svgString = await QRCode.toString(content, { ...opts, type: 'svg' });
    const encoded = encodeURIComponent(svgString);
    return `data:image/svg+xml;utf8,${encoded}`;
  } catch (err) {
    console.warn('[QR Code] Generation fallback to PNG:', err);
    try {
      return await QRCode.toDataURL(content, {
        errorCorrectionLevel: 'M',
        margin: options?.margin ?? 2,
        width: options?.width ?? 280,
        color: {
          dark: options?.darkColor || '#000000',
          light: options?.lightColor || '#ffffff',
        },
      });
    } catch {
      return '';
    }
  }
}
