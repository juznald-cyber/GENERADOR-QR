import type { Timestamp } from 'firebase/firestore';

export type QRCategory =
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'cloud'
  | 'web'
  | 'other';

export type DotType =
  | 'square'
  | 'dots'
  | 'rounded'
  | 'extra-rounded'
  | 'classy'
  | 'classy-rounded';

export type CornerSquareType = 'square' | 'dot' | 'extra-rounded';
export type CornerDotType = 'square' | 'dot';

export interface QRStyleConfig {
  fgColor: string;
  bgColor: string;
  useGradient: boolean;
  fgColor2: string;
  gradientType: 'linear' | 'radial';
  cornerSquareColor: string;
  cornerDotColor: string;
  dotType: DotType;
  cornerSquareType: CornerSquareType;
  cornerDotType: CornerDotType;
  logoDataUrl: string;
  logoSize: number; // 0.15 - 0.36 (safe range for H-level scanning)
  logoMargin: number; // 2 - 12 px
  logoPreset: string; // '' | 'custom' | preset key
}

export interface QRCodeRecord {
  shortId: string;
  title: string;
  targetUrl: string;
  category: QRCategory;
  active: boolean;
  scans: number;
  lastScannedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  ownerUid: string;
  ownerEmail: string;
  style: QRStyleConfig;
}

export const DEFAULT_QR_STYLE: QRStyleConfig = {
  fgColor: '#0F172A',
  bgColor: '#FFFFFF',
  useGradient: false,
  fgColor2: '#2563EB',
  gradientType: 'linear',
  cornerSquareColor: '#0F172A',
  cornerDotColor: '#2563EB',
  dotType: 'rounded',
  cornerSquareType: 'extra-rounded',
  cornerDotType: 'dot',
  logoDataUrl: '',
  logoSize: 0.28,
  logoMargin: 6,
  logoPreset: '',
};
