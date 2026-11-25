import type { QRCategory, QRStyleConfig } from '../types';

const SAFE_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

export function generateShortId(length = 7): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += SAFE_ALPHABET[bytes[i] % SAFE_ALPHABET.length];
  }
  return out;
}

export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isValidHttpUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function detectCategory(rawUrl: string): QRCategory {
  const url = rawUrl.toLowerCase();
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('tiktok.com')) return 'tiktok';
  if (url.includes('instagram.com') || url.includes('instagr.am')) return 'instagram';
  if (url.includes('facebook.com') || url.includes('fb.watch') || url.includes('fb.me')) return 'facebook';
  if (
    url.includes('drive.google.com') ||
    url.includes('docs.google.com') ||
    url.includes('dropbox.com') ||
    url.includes('onedrive.live.com') ||
    url.includes('1drv.ms') ||
    url.includes('mega.nz') ||
    url.includes('icloud.com') ||
    url.includes('box.com') ||
    url.includes('firebasestorage')
  ) {
    return 'cloud';
  }
  if (url.startsWith('http://') || url.startsWith('https://')) return 'web';
  return 'other';
}

export const CATEGORY_META: Record<
  QRCategory,
  { label: string; color: string; bg: string }
> = {
  youtube: { label: 'YouTube', color: '#FF4D4F', bg: 'rgba(255, 77, 79, 0.14)' },
  tiktok: { label: 'TikTok', color: '#2AF0EA', bg: 'rgba(42, 240, 234, 0.14)' },
  instagram: { label: 'Instagram', color: '#E1306C', bg: 'rgba(225, 48, 108, 0.14)' },
  facebook: { label: 'Facebook', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.14)' },
  cloud: { label: 'Nube', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.14)' },
  web: { label: 'Sitio Web', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.14)' },
  other: { label: 'Enlace', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.14)' },
};

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6);
  const num = parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Resizes and compresses any uploaded logo image (PNG/JPG/WebP/SVG) to a crisp,
 * transparent-friendly Data URL under ~90KB so it saves reliably in Firestore
 * and exports cleanly in high-resolution PNG/SVG QR codes.
 */
export async function compressLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.onload = () => {
      const src = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no compatible.'));
      img.onload = () => {
        const MAX_DIM = 220;
        let { width, height } = img;
        if (!width || !height) {
          width = MAX_DIM;
          height = MAX_DIM;
        }
        const scale = Math.min(1, MAX_DIM / Math.max(width, height));
        const targetW = Math.max(1, Math.round(width * scale));
        const targetH = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen.'));
          return;
        }
        ctx.clearRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        // Try PNG first to preserve crisp transparency; fallback to WebP if too large
        let dataUrl = canvas.toDataURL('image/png');
        if (dataUrl.length > 120000) {
          dataUrl = canvas.toDataURL('image/webp', 0.85);
        }
        if (dataUrl.length > 140000) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        }
        resolve(dataUrl);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

export const PRESET_LOGOS: { id: string; label: string; dataUrl: string }[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    dataUrl: svgToDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#FF0000"/><polygon points="40,30 72,50 40,70" fill="#FFFFFF"/></svg>`
    ),
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    dataUrl: svgToDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#111111"/><path d="M58 22v37a13 13 0 1 1-11-12.8V36a23 23 0 1 0 21 23V40c4.8 3.6 10.6 5.6 16 5.6V35.4c-7.8-.4-14.2-6.2-15.4-13.4H58z" fill="#25F4EE" transform="translate(-2,-2)"/><path d="M58 22v37a13 13 0 1 1-11-12.8V36a23 23 0 1 0 21 23V40c4.8 3.6 10.6 5.6 16 5.6V35.4c-7.8-.4-14.2-6.2-15.4-13.4H58z" fill="#FE2C55" transform="translate(2,2)"/><path d="M58 22v37a13 13 0 1 1-11-12.8V36a23 23 0 1 0 21 23V40c4.8 3.6 10.6 5.6 16 5.6V35.4c-7.8-.4-14.2-6.2-15.4-13.4H58z" fill="#FFFFFF"/></svg>`
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    dataUrl: svgToDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#FEDA75"/><stop offset="35%" stop-color="#FA7E1E"/><stop offset="65%" stop-color="#D62976"/><stop offset="100%" stop-color="#4F5BD5"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(#ig)"/><rect x="24" y="24" width="52" height="52" rx="14" fill="none" stroke="#FFF" stroke-width="7"/><circle cx="50" cy="50" r="13" fill="none" stroke="#FFF" stroke-width="7"/><circle cx="67" cy="33" r="4.2" fill="#FFF"/></svg>`
    ),
  },
  {
    id: 'facebook',
    label: 'Facebook',
    dataUrl: svgToDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#1877F2"/><path d="M62 55l2-13H52v-8c0-3.6 1.8-7 7.4-7H65V16s-5.2-.9-10.2-.9C44.4 15.1 38 21.4 38 32.8V42H27v13h11v30h14V55h10z" fill="#FFFFFF"/></svg>`
    ),
  },
  {
    id: 'cloud',
    label: 'Nube',
    dataUrl: svgToDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#0284C7"/><path d="M32 68h38a14 14 0 0 0 2.2-27.8A19 19 0 0 0 35.6 35a15 15 0 0 0-3.6 33z" fill="#FFFFFF"/></svg>`
    ),
  },
  {
    id: 'web',
    label: 'Web',
    dataUrl: svgToDataUri(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="#4F46E5"/><circle cx="50" cy="50" r="28" fill="none" stroke="#FFF" stroke-width="6"/><ellipse cx="50" cy="50" rx="13" ry="28" fill="none" stroke="#FFF" stroke-width="5"/><line x1="22" y1="50" x2="78" y2="50" stroke="#FFF" stroke-width="5"/></svg>`
    ),
  },
];

export const COLOR_THEMES: {
  name: string;
  patch: Partial<QRStyleConfig>;
}[] = [
  {
    name: 'Clásico',
    patch: {
      fgColor: '#0F172A',
      bgColor: '#FFFFFF',
      useGradient: false,
      cornerSquareColor: '#0F172A',
      cornerDotColor: '#0F172A',
    },
  },
  {
    name: 'Océano',
    patch: {
      fgColor: '#0369A1',
      fgColor2: '#4F46E5',
      bgColor: '#FFFFFF',
      useGradient: true,
      gradientType: 'linear',
      cornerSquareColor: '#0F172A',
      cornerDotColor: '#0284C7',
    },
  },
  {
    name: 'YouTube',
    patch: {
      fgColor: '#18181B',
      bgColor: '#FFFFFF',
      useGradient: false,
      cornerSquareColor: '#DC2626',
      cornerDotColor: '#DC2626',
    },
  },
  {
    name: 'Instagram',
    patch: {
      fgColor: '#833AB4',
      fgColor2: '#E1306C',
      bgColor: '#FFFFFF',
      useGradient: true,
      gradientType: 'linear',
      cornerSquareColor: '#833AB4',
      cornerDotColor: '#FD1D1D',
    },
  },
  {
    name: 'Esmeralda',
    patch: {
      fgColor: '#065F46',
      fgColor2: '#0D9488',
      bgColor: '#FFFFFF',
      useGradient: true,
      gradientType: 'linear',
      cornerSquareColor: '#064E3B',
      cornerDotColor: '#10B981',
    },
  },
  {
    name: 'Dorado',
    patch: {
      fgColor: '#92400E',
      fgColor2: '#B45309',
      bgColor: '#FFFBEB',
      useGradient: true,
      gradientType: 'linear',
      cornerSquareColor: '#78350F',
      cornerDotColor: '#D97706',
    },
  },
];

export function buildQrStylingOptions(
  data: string,
  style: QRStyleConfig,
  size = 260
) {
  const dotsOptions: Record<string, unknown> = {
    type: style.dotType,
  };

  if (style.useGradient) {
    dotsOptions.color = undefined;
    dotsOptions.gradient = {
      type: style.gradientType,
      rotation: Math.PI / 4,
      colorStops: [
        { offset: 0, color: style.fgColor },
        { offset: 1, color: style.fgColor2 },
      ],
    };
  } else {
    dotsOptions.gradient = undefined;
    dotsOptions.color = style.fgColor;
  }

  return {
    width: size,
    height: size,
    type: 'svg' as const,
    data,
    margin: Math.max(8, Math.round(size * 0.04)),
    qrOptions: {
      typeNumber: 0 as const,
      mode: 'Byte' as const,
      errorCorrectionLevel: 'H' as const,
    },
    image: style.logoDataUrl || undefined,
    imageOptions: {
      hideBackgroundDots: true,
      imageSize: Math.min(0.36, Math.max(0.15, style.logoSize)),
      margin: Math.min(14, Math.max(2, style.logoMargin)),
      crossOrigin: 'anonymous',
    },
    dotsOptions,
    backgroundOptions: {
      color: style.bgColor,
    },
    cornersSquareOptions: {
      type: style.cornerSquareType,
      color: style.cornerSquareColor,
    },
    cornersDotOptions: {
      type: style.cornerDotType,
      color: style.cornerDotColor,
    },
  };
}
