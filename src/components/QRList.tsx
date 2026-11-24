import React, { useMemo, useState } from 'react';
import {
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, buildDynamicQrUrl } from '../firebase';
import { DEFAULT_QR_STYLE, type QRCategory, type QRCodeRecord } from '../types';
import { CATEGORY_META } from '../utils/qrHelpers';
import { QRPreview, downloadStyledQr } from './QRPreview';
import {
  Search,
  Plus,
  Download,
  Edit3,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  ScanLine,
  Power,
  QrCode,
} from 'lucide-react';

interface QRListProps {
  records: QRCodeRecord[];
  loading: boolean;
  onCreateNew: () => void;
  onEdit: (record: QRCodeRecord) => void;
}

export const QRList: React.FC<QRListProps> = ({
  records,
  loading,
  onCreateNew,
  onEdit,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | QRCategory>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<QRCodeRecord | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((rec) => {
      if (categoryFilter !== 'all' && rec.category !== categoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        rec.title.toLowerCase().includes(q) ||
        rec.targetUrl.toLowerCase().includes(q) ||
        rec.shortId.toLowerCase().includes(q)
      );
    });
  }, [records, search, categoryFilter]);

  const handleCopy = async (shortId: string) => {
    try {
      await navigator.clipboard.writeText(buildDynamicQrUrl(shortId));
      setCopiedId(shortId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard errors
    }
  };

  const handleToggleActive = async (rec: QRCodeRecord) => {
    setBusyId(rec.shortId);
    try {
      await updateDoc(doc(db, 'qr_codes', rec.shortId), {
        active: !rec.active,
        updatedAt: serverTimestamp(),
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setBusyId(confirmDelete.shortId);
    try {
      await deleteDoc(doc(db, 'qr_codes', confirmDelete.shortId));
      setConfirmDelete(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="list-container">
      <div className="section-header">
        <div>
          <h2>Mis Códigos QR</h2>
          <p>Activos para siempre hasta que tú los pauses o elimines.</p>
        </div>
        <button type="button" className="btn btn-primary desktop-only-btn" onClick={onCreateNew}>
          <Plus size={17} />
          <span>Nuevo QR</span>
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-box">
          <Search size={17} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, enlace o código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-chips-scroll">
          <button
            type="button"
            className={`filter-chip ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            Todos ({records.length})
          </button>
          {(Object.keys(CATEGORY_META) as QRCategory[]).map((cat) => {
            const count = records.filter((r) => r.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                type="button"
                className={`filter-chip ${categoryFilter === cat ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {CATEGORY_META[cat].label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="loader-ring" />
          <p>Cargando tus códigos QR...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <QrCode size={34} />
          </div>
          <h3>{records.length === 0 ? 'Aún no tienes códigos QR' : 'Sin resultados'}</h3>
          <p>
            {records.length === 0
              ? 'Crea tu primer QR dinámico personalizado con colores y tu logo.'
              : 'Prueba buscando con otro término o quita los filtros.'}
          </p>
          {records.length === 0 && (
            <button type="button" className="btn btn-primary" onClick={onCreateNew}>
              <Plus size={17} />
              <span>Crear mi primer QR</span>
            </button>
          )}
        </div>
      ) : (
        <div className="qr-cards-grid">
          {filtered.map((rec) => {
            const meta = CATEGORY_META[rec.category] || CATEGORY_META.other;
            const qrUrl = buildDynamicQrUrl(rec.shortId);
            const mergedStyle = { ...DEFAULT_QR_STYLE, ...rec.style };
            const isBusy = busyId === rec.shortId;

            return (
              <article
                key={rec.shortId}
                className={`qr-card ${!rec.active ? 'qr-card-paused' : ''}`}
              >
                <div className="qr-card-top">
                  <div
                    className="qr-thumb-box"
                    style={{ background: mergedStyle.bgColor }}
                  >
                    <QRPreview data={qrUrl} style={mergedStyle} size={84} />
                  </div>

                  <div className="qr-card-info">
                    <div className="qr-card-badges">
                      <span
                        className="cat-chip"
                        style={{ color: meta.color, background: meta.bg }}
                      >
                        {meta.label}
                      </span>
                      <span
                        className={`status-dot-pill ${
                          rec.active ? 'active' : 'paused'
                        }`}
                      >
                        {rec.active ? 'Activo' : 'Pausado'}
                      </span>
                    </div>

                    <h3 className="qr-card-title" title={rec.title}>
                      {rec.title}
                    </h3>

                    <a
                      href={rec.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="qr-card-url"
                      title={rec.targetUrl}
                    >
                      <span>{rec.targetUrl.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink size={12} />
                    </a>

                    <div className="qr-card-meta">
                      <span className="meta-scans">
                        <ScanLine size={13} />
                        <strong>{rec.scans || 0}</strong> escaneos
                      </span>
                      <span className="meta-slug">/r/{rec.shortId}</span>
                    </div>
                  </div>
                </div>

                <div className="qr-card-actions">
                  <button
                    type="button"
                    className="card-action-btn"
                    onClick={() => downloadStyledQr(qrUrl, mergedStyle, rec.title, 'png')}
                    title="Descargar PNG HD"
                  >
                    <Download size={15} />
                    <span>PNG</span>
                  </button>

                  <button
                    type="button"
                    className="card-action-btn"
                    onClick={() => handleCopy(rec.shortId)}
                    title="Copiar enlace permanente"
                  >
                    {copiedId === rec.shortId ? (
                      <Check size={15} />
                    ) : (
                      <Copy size={15} />
                    )}
                    <span>{copiedId === rec.shortId ? 'Copiado' : 'Link'}</span>
                  </button>

                  <button
                    type="button"
                    className="card-action-btn"
                    onClick={() => onEdit(rec)}
                    title="Editar enlace o diseño"
                  >
                    <Edit3 size={15} />
                    <span>Editar</span>
                  </button>

                  <button
                    type="button"
                    className={`card-action-btn ${
                      rec.active ? '' : 'action-resume'
                    }`}
                    onClick={() => handleToggleActive(rec)}
                    disabled={isBusy}
                    title={rec.active ? 'Pausar QR' : 'Reactivar QR'}
                  >
                    <Power size={15} />
                    <span>{rec.active ? 'Pausar' : 'Activar'}</span>
                  </button>

                  <button
                    type="button"
                    className="card-action-btn action-delete"
                    onClick={() => setConfirmDelete(rec)}
                    disabled={isBusy}
                    title="Eliminar permanentemente"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>¿Eliminar este código QR?</h3>
            <p>
              Vas a eliminar <strong>{confirmDelete.title}</strong> (
              <code>/r/{confirmDelete.shortId}</code>). Esta acción es permanente y
              cualquier persona que escanee este QR ya no podrá abrir el enlace.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={busyId === confirmDelete.shortId}
              >
                <Trash2 size={16} />
                <span>Sí, eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
