import React, { useEffect, useState } from 'react';
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { ExternalLink, QrCode, ShieldOff, Loader2 } from 'lucide-react';

interface RedirectViewProps {
  shortId: string;
}

export const RedirectView: React.FC<RedirectViewProps> = ({ shortId }) => {
  const [status, setStatus] = useState<'loading' | 'redirecting' | 'inactive' | 'not_found' | 'error'>('loading');
  const [targetUrl, setTargetUrl] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    let cancelled = false;

    const resolveQr = async () => {
      try {
        const ref = doc(db, 'qr_codes', shortId);
        const snap = await getDoc(ref);

        if (cancelled) return;

        if (!snap.exists()) {
          setStatus('not_found');
          return;
        }

        const data = snap.data();
        if (!data.active) {
          setTitle(data.title || '');
          setStatus('inactive');
          return;
        }

        const url = String(data.targetUrl || '');
        if (!/^https?:\/\//i.test(url)) {
          setStatus('error');
          return;
        }

        setTargetUrl(url);
        setTitle(data.title || 'Redirigiendo...');
        setStatus('redirecting');

        // Increment scan count atomically (best-effort, never blocks redirect)
        try {
          await updateDoc(ref, {
            scans: increment(1),
            lastScannedAt: serverTimestamp(),
          });
        } catch {
          // Ignore counter error so redirect always succeeds
        }

        window.location.replace(url);
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    resolveQr();
    return () => {
      cancelled = true;
    };
  }, [shortId]);

  return (
    <div className="redirect-page">
      <div className="redirect-card">
        <div className="redirect-icon">
          {status === 'loading' || status === 'redirecting' ? (
            <Loader2 size={32} className="spin" />
          ) : status === 'inactive' || status === 'not_found' ? (
            <ShieldOff size={32} />
          ) : (
            <QrCode size={32} />
          )}
        </div>

        {status === 'loading' && (
          <>
            <h2>Verificando código QR...</h2>
            <p>Conectando con el destino seguro.</p>
          </>
        )}

        {status === 'redirecting' && (
          <>
            <h2>Abriendo {title}</h2>
            <p>Si no se abre automáticamente, toca el botón de abajo:</p>
            <a href={targetUrl} className="btn btn-primary btn-full" rel="noopener noreferrer">
              <span>Continuar al enlace</span>
              <ExternalLink size={16} />
            </a>
          </>
        )}

        {status === 'inactive' && (
          <>
            <h2>Código QR pausado</h2>
            <p>
              Este enlace fue desactivado temporalmente por el administrador.
            </p>
          </>
        )}

        {status === 'not_found' && (
          <>
            <h2>Código QR no disponible</h2>
            <p>
              Este código QR fue eliminado o ya no existe en la plataforma.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h2>No se pudo abrir el enlace</h2>
            <p>Ocurrió un error al consultar el destino. Intenta escanear de nuevo.</p>
          </>
        )}
      </div>
    </div>
  );
};
