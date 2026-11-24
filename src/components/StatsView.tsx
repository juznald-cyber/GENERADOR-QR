import React, { useMemo } from 'react';
import type { QRCategory, QRCodeRecord } from '../types';
import { CATEGORY_META } from '../utils/qrHelpers';
import { QrCode, ScanLine, CheckCircle2, PauseCircle, TrendingUp } from 'lucide-react';

interface StatsViewProps {
  records: QRCodeRecord[];
  onEdit: (record: QRCodeRecord) => void;
}

export const StatsView: React.FC<StatsViewProps> = ({ records, onEdit }) => {
  const stats = useMemo(() => {
    const total = records.length;
    const active = records.filter((r) => r.active).length;
    const paused = total - active;
    const totalScans = records.reduce((sum, r) => sum + (r.scans || 0), 0);

    const byCategory = (Object.keys(CATEGORY_META) as QRCategory[])
      .map((cat) => {
        const items = records.filter((r) => r.category === cat);
        const scans = items.reduce((s, r) => s + (r.scans || 0), 0);
        return {
          cat,
          count: items.length,
          scans,
          meta: CATEGORY_META[cat],
        };
      })
      .filter((x) => x.count > 0)
      .sort((a, b) => b.scans - a.scans || b.count - a.count);

    const topQrs = [...records]
      .sort((a, b) => (b.scans || 0) - (a.scans || 0))
      .slice(0, 6);

    return { total, active, paused, totalScans, byCategory, topQrs };
  }, [records]);

  return (
    <div className="stats-container">
      <div className="section-header">
        <div>
          <h2>Estadísticas</h2>
          <p>Resumen en tiempo real del rendimiento de tus códigos QR.</p>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon kpi-blue">
            <QrCode size={20} />
          </div>
          <div>
            <span className="kpi-label">Total QRs</span>
            <strong className="kpi-value">{stats.total}</strong>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-purple">
            <ScanLine size={20} />
          </div>
          <div>
            <span className="kpi-label">Escaneos totales</span>
            <strong className="kpi-value">{stats.totalScans}</strong>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-green">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span className="kpi-label">Activos</span>
            <strong className="kpi-value">{stats.active}</strong>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon kpi-amber">
            <PauseCircle size={20} />
          </div>
          <div>
            <span className="kpi-label">Pausados</span>
            <strong className="kpi-value">{stats.paused}</strong>
          </div>
        </div>
      </div>

      <div className="stats-panels">
        <section className="panel-card">
          <div className="panel-title-row">
            <TrendingUp size={18} />
            <h3>QRs más escaneados</h3>
          </div>
          {stats.topQrs.length === 0 ? (
            <p className="muted-text">Aún no hay códigos registrados.</p>
          ) : (
            <div className="ranking-list">
              {stats.topQrs.map((rec, idx) => (
                <button
                  key={rec.shortId}
                  type="button"
                  className="ranking-item"
                  onClick={() => onEdit(rec)}
                >
                  <span className="ranking-pos">#{idx + 1}</span>
                  <div className="ranking-main">
                    <div className="ranking-name">{rec.title}</div>
                    <div className="ranking-sub">/r/{rec.shortId}</div>
                  </div>
                  <span className="ranking-count">{rec.scans || 0}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="panel-card">
          <div className="panel-title-row">
            <QrCode size={18} />
            <h3>Por plataforma</h3>
          </div>
          {stats.byCategory.length === 0 ? (
            <p className="muted-text">Crea tu primer QR para ver la distribución.</p>
          ) : (
            <div className="cat-breakdown">
              {stats.byCategory.map((item) => {
                const pct =
                  stats.total > 0
                    ? Math.round((item.count / stats.total) * 100)
                    : 0;
                return (
                  <div key={item.cat} className="breakdown-row">
                    <div className="breakdown-top">
                      <span
                        className="cat-chip"
                        style={{
                          color: item.meta.color,
                          background: item.meta.bg,
                        }}
                      >
                        {item.meta.label}
                      </span>
                      <span className="breakdown-nums">
                        {item.count} QR{item.count === 1 ? '' : 's'} · {item.scans} escaneos
                      </span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${pct}%`,
                          background: item.meta.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
