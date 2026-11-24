import React, { useState, useRef, useMemo } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, buildDynamicQrUrl } from '../firebase';
import {
  DEFAULT_QR_STYLE,
  type CornerDotType,
  type CornerSquareType,
  type DotType,
  type QRCodeRecord,
  type QRStyleConfig,
} from '../types';
import {
  CATEGORY_META,
  COLOR_THEMES,
  PRESET_LOGOS,
  compressLogoFile,
  detectCategory,
  generateShortId,
  getContrastRatio,
  isValidHttpUrl,
  normalizeUrl,
  sanitizeSlug,
} from '../utils/qrHelpers';
import { QRPreview, downloadStyledQr } from './QRPreview';
import {
  Link2,
  Palette,
  Image as ImageIcon,
  Download,
  Save,
  RefreshCw,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

interface QRStudioProps {
  userUid: string;
  userEmail: string;
  editingRecord: QRCodeRecord | null;
  onSaved: (saved: QRCodeRecord) => void;
  onCancelEdit: () => void;
}

type StudioTab = 'link' | 'design' | 'logo';

const DOT_OPTIONS: { value: DotType; label: string }[] = [
  { value: 'rounded', label: 'Redondeado' },
  { value: 'dots', label: 'Puntos' },
  { value: 'square', label: 'Clásico' },
  { value: 'extra-rounded', label: 'Suave' },
  { value: 'classy', label: 'Elegante' },
  { value: 'classy-rounded', label: 'Elegante+' },
];

const CORNER_SQUARE_OPTIONS: { value: CornerSquareType; label: string }[] = [
  { value: 'extra-rounded', label: 'Redondeado' },
  { value: 'square', label: 'Cuadrado' },
  { value: 'dot', label: 'Circular' },
];

const CORNER_DOT_OPTIONS: { value: CornerDotType; label: string }[] = [
  { value: 'dot', label: 'Punto' },
  { value: 'square', label: 'Cuadrado' },
];

export const QRStudio: React.FC<QRStudioProps> = ({
  userUid,
  userEmail,
  editingRecord,
  onSaved,
  onCancelEdit,
}) => {
  const isEditing = Boolean(editingRecord);

  const [activeTab, setActiveTab] = useState<StudioTab>('link');
  const [title, setTitle] = useState(editingRecord?.title || '');
  const [targetUrl, setTargetUrl] = useState(editingRecord?.targetUrl || '');
  const [shortId, setShortId] = useState(
    editingRecord?.shortId || generateShortId()
  );
  const [style, setStyle] = useState<QRStyleConfig>(
    editingRecord?.style
      ? { ...DEFAULT_QR_STYLE, ...editingRecord.style }
      : { ...DEFAULT_QR_STYLE }
  );

  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<'png' | 'svg' | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizedPreviewUrl = normalizeUrl(targetUrl);
  const detectedCategory = detectCategory(normalizedPreviewUrl);
  const categoryInfo = CATEGORY_META[detectedCategory];
  const dynamicUrl = buildDynamicQrUrl(shortId || 'preview');

  const contrastRatio = useMemo(
    () => getContrastRatio(style.fgColor, style.bgColor),
    [style.fgColor, style.bgColor]
  );

  const isGoodContrast = contrastRatio >= 3.2;

  const updateStyle = (patch: Partial<QRStyleConfig>) => {
    setStyle((prev) => ({ ...prev, ...patch }));
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const dataUrl = await compressLogoFile(file);
      updateStyle({ logoDataUrl: dataUrl, logoPreset: 'custom' });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo cargar la imagen.'
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(dynamicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const handleDownload = async (ext: 'png' | 'svg') => {
    setDownloading(ext);
    try {
      await downloadStyledQr(dynamicUrl, style, title || shortId, ext);
    } finally {
      setDownloading(null);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccessMsg('');

    const cleanTitle = title.trim();
    const cleanUrl = normalizeUrl(targetUrl);
    const cleanSlug = isEditing ? editingRecord!.shortId : sanitizeSlug(shortId);

    if (!cleanTitle) {
      setError('Escribe un nombre para identificar este código QR.');
      setActiveTab('link');
      return;
    }
    if (!cleanUrl || !isValidHttpUrl(cleanUrl)) {
      setError('Ingresa un enlace válido (YouTube, TikTok, Instagram, Facebook, web o nube).');
      setActiveTab('link');
      return;
    }
    if (cleanSlug.length < 3 || !/^[a-z0-9_-]{3,40}$/.test(cleanSlug)) {
      setError('El código corto debe tener entre 3 y 40 caracteres (letras minúsculas, números o guiones).');
      setActiveTab('link');
      return;
    }

    setSaving(true);
    try {
      const ref = doc(db, 'qr_codes', cleanSlug);
      const category = detectCategory(cleanUrl);

      if (isEditing && editingRecord) {
        await updateDoc(ref, {
          title: cleanTitle,
          targetUrl: cleanUrl,
          category,
          style,
          updatedAt: serverTimestamp(),
        });

        setSuccessMsg('Cambios guardados. Tu QR impreso sigue funcionando con la nueva configuración.');
        onSaved({
          ...editingRecord,
          title: cleanTitle,
          targetUrl: cleanUrl,
          category,
          style,
        });
      } else {
        const existing = await getDoc(ref);
        if (existing.exists()) {
          setError(`El código "${cleanSlug}" ya está en uso. Elige otro o genera uno aleatorio.`);
          setActiveTab('link');
          setSaving(false);
          return;
        }

        const payload = {
          shortId: cleanSlug,
          title: cleanTitle,
          targetUrl: cleanUrl,
          category,
          active: true,
          scans: 0,
          lastScannedAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ownerUid: userUid,
          ownerEmail: userEmail,
          style,
        };

        await setDoc(ref, payload);
        setSuccessMsg('¡QR dinámico creado! Nunca caducará a menos que lo elimines.');
        onSaved({
          ...payload,
          createdAt: null,
          updatedAt: null,
        });
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || '';
      if (msg.includes('permission-denied') || msg.includes('PERMISSION_DENIED')) {
        setError('Sin permisos en Firestore. Verifica las reglas o tu sesión.');
      } else {
        setError('No se pudo guardar el QR. Verifica tu conexión a internet.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="studio-container">
      <div className="section-header">
        <div>
          <h2>{isEditing ? 'Editar Código QR' : 'Crear Nuevo Código QR'}</h2>
          <p>
            {isEditing
              ? 'Puedes cambiar el enlace o el diseño sin que el código deje de funcionar.'
              : 'Genera un QR dinámico permanente con tus colores y cualquier logo.'}
          </p>
        </div>
        {isEditing && (
          <button type="button" className="btn btn-ghost" onClick={onCancelEdit}>
            <X size={16} />
            <span>Cancelar</span>
          </button>
        )}
      </div>

      <div className="studio-grid">
        {/* LIVE PREVIEW PANEL */}
        <div className="studio-preview-col">
          <div className="preview-card">
            <div className="preview-stage" style={{ background: style.bgColor }}>
              <QRPreview data={dynamicUrl} style={style} size={236} />
            </div>

            <div className="scan-health">
              {isGoodContrast ? (
                <div className="health-pill health-ok">
                  <CheckCircle2 size={15} />
                  <span>Escaneable 100% · Corrección Nivel H (30%)</span>
                </div>
              ) : (
                <div className="health-pill health-warn">
                  <AlertTriangle size={15} />
                  <span>Contraste bajo ({contrastRatio.toFixed(1)}:1) — Usa colores más contrastantes</span>
                </div>
              )}
            </div>

            <div className="short-link-box">
              <span className="short-link-text" title={dynamicUrl}>
                {dynamicUrl.replace(/^https?:\/\//, '')}
              </span>
              <button
                type="button"
                className="icon-btn"
                onClick={handleCopyLink}
                title="Copiar enlace permanente"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>

            <div className="preview-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleDownload('png')}
                disabled={downloading !== null}
              >
                <Download size={16} />
                <span>{downloading === 'png' ? 'Generando...' : 'PNG HD'}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleDownload('svg')}
                disabled={downloading !== null}
              >
                <Download size={16} />
                <span>{downloading === 'svg' ? 'Generando...' : 'SVG Vector'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* CONTROLS PANEL */}
        <div className="studio-controls-col">
          <div className="segmented-tabs">
            <button
              type="button"
              className={`seg-tab ${activeTab === 'link' ? 'active' : ''}`}
              onClick={() => setActiveTab('link')}
            >
              <Link2 size={16} />
              <span>Enlace</span>
            </button>
            <button
              type="button"
              className={`seg-tab ${activeTab === 'design' ? 'active' : ''}`}
              onClick={() => setActiveTab('design')}
            >
              <Palette size={16} />
              <span>Colores</span>
            </button>
            <button
              type="button"
              className={`seg-tab ${activeTab === 'logo' ? 'active' : ''}`}
              onClick={() => setActiveTab('logo')}
            >
              <ImageIcon size={16} />
              <span>Logo</span>
            </button>
          </div>

          <div className="controls-card">
            {activeTab === 'link' && (
              <div className="controls-stack">
                <div className="field-group">
                  <label htmlFor="qr-title">Nombre del código QR</label>
                  <input
                    id="qr-title"
                    type="text"
                    maxLength={120}
                    placeholder="Ej: Video Promocional YouTube"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="field-group">
                  <div className="label-row">
                    <label htmlFor="qr-url">Enlace de destino</label>
                    {targetUrl.trim() && (
                      <span
                        className="cat-chip"
                        style={{
                          color: categoryInfo.color,
                          background: categoryInfo.bg,
                        }}
                      >
                        {categoryInfo.label}
                      </span>
                    )}
                  </div>
                  <input
                    id="qr-url"
                    type="url"
                    placeholder="https://youtube.com/..., tiktok.com/..., drive.google.com/..."
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                  />
                  <span className="field-help">
                    Compatible con YouTube, TikTok, Instagram, Facebook, Google Drive, Dropbox, OneDrive y cualquier página web.
                  </span>
                </div>

                <div className="field-group">
                  <label htmlFor="qr-slug">Identificador único del QR (URL corta)</label>
                  <div className="slug-row">
                    <div className="slug-input-wrap">
                      <span className="slug-prefix">/r/</span>
                      <input
                        id="qr-slug"
                        type="text"
                        maxLength={40}
                        value={shortId}
                        disabled={isEditing}
                        onChange={(e) => setShortId(sanitizeSlug(e.target.value))}
                        placeholder="mi-codigo"
                      />
                    </div>
                    {!isEditing && (
                      <button
                        type="button"
                        className="btn btn-secondary icon-only-sm"
                        onClick={() => setShortId(generateShortId())}
                        title="Generar nuevo código aleatorio"
                      >
                        <RefreshCw size={16} />
                      </button>
                    )}
                  </div>
                  <span className="field-help">
                    {isEditing
                      ? 'El identificador no cambia para no romper los códigos ya impresos.'
                      : 'Este enlace nunca caduca; solo deja de funcionar si lo pausas o eliminas.'}
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'design' && (
              <div className="controls-stack">
                <div className="field-group">
                  <label>
                    <Sparkles size={14} style={{ display: 'inline', marginRight: 6 }} />
                    Temas rápidos
                  </label>
                  <div className="theme-pills">
                    {COLOR_THEMES.map((t) => (
                      <button
                        key={t.name}
                        type="button"
                        className="theme-pill"
                        onClick={() => updateStyle(t.patch)}
                      >
                        <span
                          className="theme-swatch"
                          style={{
                            background: t.patch.useGradient
                              ? `linear-gradient(135deg, ${t.patch.fgColor}, ${t.patch.fgColor2})`
                              : t.patch.fgColor,
                          }}
                        />
                        <span>{t.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="color-grid">
                  <div className="color-picker-item">
                    <label>Color del QR</label>
                    <div className="color-input-box">
                      <input
                        type="color"
                        value={style.fgColor}
                        onChange={(e) => updateStyle({ fgColor: e.target.value })}
                      />
                      <span>{style.fgColor.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="color-picker-item">
                    <label>Color de fondo</label>
                    <div className="color-input-box">
                      <input
                        type="color"
                        value={style.bgColor}
                        onChange={(e) => updateStyle({ bgColor: e.target.value })}
                      />
                      <span>{style.bgColor.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="color-picker-item">
                    <label>Marco esquinas</label>
                    <div className="color-input-box">
                      <input
                        type="color"
                        value={style.cornerSquareColor}
                        onChange={(e) =>
                          updateStyle({ cornerSquareColor: e.target.value })
                        }
                      />
                      <span>{style.cornerSquareColor.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="color-picker-item">
                    <label>Centro esquinas</label>
                    <div className="color-input-box">
                      <input
                        type="color"
                        value={style.cornerDotColor}
                        onChange={(e) =>
                          updateStyle({ cornerDotColor: e.target.value })
                        }
                      />
                      <span>{style.cornerDotColor.toUpperCase()}</span>
                    </div>
                  </div>
                </div>

                <div className="toggle-row">
                  <div>
                    <div className="toggle-title">Degradado en los puntos</div>
                    <div className="toggle-sub">Combina dos colores en el patrón del QR</div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={style.useGradient}
                      onChange={(e) =>
                        updateStyle({ useGradient: e.target.checked })
                      }
                    />
                    <span className="slider" />
                  </label>
                </div>

                {style.useGradient && (
                  <div className="color-grid">
                    <div className="color-picker-item">
                      <label>Segundo color</label>
                      <div className="color-input-box">
                        <input
                          type="color"
                          value={style.fgColor2}
                          onChange={(e) =>
                            updateStyle({ fgColor2: e.target.value })
                          }
                        />
                        <span>{style.fgColor2.toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="color-picker-item">
                      <label>Tipo de degradado</label>
                      <select
                        value={style.gradientType}
                        onChange={(e) =>
                          updateStyle({
                            gradientType: e.target.value as 'linear' | 'radial',
                          })
                        }
                      >
                        <option value="linear">Lineal diagonal</option>
                        <option value="radial">Radial centro</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="field-group">
                  <label>Estilo de los módulos</label>
                  <div className="option-chips">
                    {DOT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`option-chip ${
                          style.dotType === opt.value ? 'active' : ''
                        }`}
                        onClick={() => updateStyle({ dotType: opt.value })}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="two-col-row">
                  <div className="field-group">
                    <label>Forma de esquinas</label>
                    <div className="option-chips">
                      {CORNER_SQUARE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`option-chip ${
                            style.cornerSquareType === opt.value ? 'active' : ''
                          }`}
                          onClick={() =>
                            updateStyle({ cornerSquareType: opt.value })
                          }
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field-group">
                    <label>Punto de esquina</label>
                    <div className="option-chips">
                      {CORNER_DOT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`option-chip ${
                            style.cornerDotType === opt.value ? 'active' : ''
                          }`}
                          onClick={() =>
                            updateStyle({ cornerDotType: opt.value })
                          }
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logo' && (
              <div className="controls-stack">
                <div className="field-group">
                  <label>Subir tu propio logo (PNG, JPG, SVG o WebP)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleUploadLogo}
                    style={{ display: 'none' }}
                  />
                  <div className="upload-row">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={16} />
                      <span>Elegir imagen</span>
                    </button>
                    {style.logoDataUrl && (
                      <button
                        type="button"
                        className="btn btn-danger-soft"
                        onClick={() =>
                          updateStyle({ logoDataUrl: '', logoPreset: '' })
                        }
                      >
                        <Trash2 size={16} />
                        <span>Quitar logo</span>
                      </button>
                    )}
                  </div>
                  <span className="field-help">
                    El QR usa corrección de errores Nivel H y limpia el centro automáticamente para que se escanee sin fallos.
                  </span>
                </div>

                <div className="field-group">
                  <label>O elige un ícono rápido</label>
                  <div className="preset-logos-grid">
                    {PRESET_LOGOS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`preset-logo-btn ${
                          style.logoPreset === item.id ? 'active' : ''
                        }`}
                        onClick={() =>
                          updateStyle({
                            logoDataUrl: item.dataUrl,
                            logoPreset: item.id,
                          })
                        }
                      >
                        <img src={item.dataUrl} alt={item.label} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {style.logoDataUrl && (
                  <div className="two-col-row">
                    <div className="field-group">
                      <div className="label-row">
                        <label>Tamaño del logo</label>
                        <span className="range-val">
                          {Math.round(style.logoSize * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.16}
                        max={0.35}
                        step={0.01}
                        value={style.logoSize}
                        onChange={(e) =>
                          updateStyle({ logoSize: parseFloat(e.target.value) })
                        }
                      />
                    </div>

                    <div className="field-group">
                      <div className="label-row">
                        <label>Margen libre</label>
                        <span className="range-val">{style.logoMargin} px</span>
                      </div>
                      <input
                        type="range"
                        min={2}
                        max={12}
                        step={1}
                        value={style.logoMargin}
                        onChange={(e) =>
                          updateStyle({ logoMargin: parseInt(e.target.value, 10) })
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="alert alert-error" style={{ marginTop: 16 }}>
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="alert alert-success" style={{ marginTop: 16 }}>
                <CheckCircle2 size={16} />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="studio-save-bar">
              <button
                type="button"
                className="btn btn-primary btn-full"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={17} />
                <span>
                  {saving
                    ? 'Guardando en la nube...'
                    : isEditing
                    ? 'Guardar cambios'
                    : 'Guardar QR Dinámico'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
