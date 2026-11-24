import React, { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';
import type { QRStyleConfig } from '../types';
import { buildQrStylingOptions } from '../utils/qrHelpers';

interface QRPreviewProps {
  data: string;
  style: QRStyleConfig;
  size?: number;
  className?: string;
}

export const QRPreview: React.FC<QRPreviewProps> = ({
  data,
  style,
  size = 240,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    const options = buildQrStylingOptions(data || 'https://generador-qr-96098.web.app', style, size);

    if (!qrRef.current) {
      qrRef.current = new QRCodeStyling(options as never);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        qrRef.current.append(containerRef.current);
      }
    } else {
      qrRef.current.update(options as never);
    }
  }, [data, style, size]);

  return (
    <div
      ref={containerRef}
      className={`qr-preview-canvas ${className}`}
      style={{ width: size, height: size, maxWidth: '100%' }}
    />
  );
};

export async function downloadStyledQr(
  data: string,
  style: QRStyleConfig,
  filename: string,
  extension: 'png' | 'svg'
): Promise<void> {
  const exportSize = extension === 'png' ? 1600 : 1000;
  const options = buildQrStylingOptions(data, style, exportSize);
  const instance = new QRCodeStyling({
    ...options,
    type: extension === 'png' ? 'canvas' : 'svg',
  } as never);

  const safeName = filename
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'codigo-qr';

  await instance.download({
    name: safeName,
    extension,
  });
}
