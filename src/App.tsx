import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { QRCodeRecord } from './types';
import { LoginScreen } from './components/LoginScreen';
import { RedirectView } from './components/RedirectView';
import { QRList } from './components/QRList';
import { QRStudio } from './components/QRStudio';
import { StatsView } from './components/StatsView';
import { AccountView } from './components/AccountView';
import {
  QrCode,
  LayoutGrid,
  PlusCircle,
  BarChart3,
  UserCircle2,
  Loader2,
} from 'lucide-react';

type NavTab = 'list' | 'studio' | 'stats' | 'account';

function getShortIdFromLocation(): string | null {
  const pathMatch = window.location.pathname.match(/\/r\/([a-zA-Z0-9_-]{3,40})\/?$/);
  if (pathMatch?.[1]) {
    return pathMatch[1].toLowerCase();
  }
  const params = new URLSearchParams(window.location.search);
  const queryId = params.get('r');
  if (queryId && /^[a-zA-Z0-9_-]{3,40}$/.test(queryId)) {
    return queryId.toLowerCase();
  }
  return null;
}

export const App: React.FC = () => {
  const redirectShortId = useMemo(() => getShortIdFromLocation(), []);

  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [activeTab, setActiveTab] = useState<NavTab>('list');
  const [editingRecord, setEditingRecord] = useState<QRCodeRecord | null>(null);
  const [studioKey, setStudioKey] = useState(0);

  const [records, setRecords] = useState<QRCodeRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  useEffect(() => {
    if (redirectShortId) return;
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, [redirectShortId]);

  useEffect(() => {
    if (redirectShortId || !user) {
      setRecords([]);
      setLoadingRecords(false);
      return;
    }

    setLoadingRecords(true);
    const q = query(collection(db, 'qr_codes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: QRCodeRecord[] = snapshot.docs.map((d) => ({
          ...(d.data() as QRCodeRecord),
          shortId: d.id,
        }));
        setRecords(list);
        setLoadingRecords(false);
      },
      () => {
        setLoadingRecords(false);
      }
    );

    return () => unsub();
  }, [redirectShortId, user]);

  // Public redirect mode when someone scans a QR code
  if (redirectShortId) {
    return <RedirectView shortId={redirectShortId} />;
  }

  if (!authReady) {
    return (
      <div className="splash-screen">
        <div className="splash-box">
          <Loader2 size={30} className="spin" />
          <span>Cargando QR Studio Pro...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const handleOpenCreate = () => {
    setEditingRecord(null);
    setStudioKey((k) => k + 1);
    setActiveTab('studio');
  };

  const handleOpenEdit = (record: QRCodeRecord) => {
    setEditingRecord(record);
    setStudioKey((k) => k + 1);
    setActiveTab('studio');
  };

  const handleSaved = () => {
    setEditingRecord(null);
    setActiveTab('list');
  };

  return (
    <div className="app-shell">
      {/* DESKTOP SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <QrCode size={22} />
          </div>
          <div className="brand-copy">
            <strong>QR Studio Pro</strong>
            <span>Panel Privado</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-item ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <LayoutGrid size={19} />
            <span>Mis QRs</span>
            <span className="nav-badge">{records.length}</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeTab === 'studio' ? 'active' : ''}`}
            onClick={handleOpenCreate}
          >
            <PlusCircle size={19} />
            <span>Crear QR</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            <BarChart3 size={19} />
            <span>Estadísticas</span>
          </button>

          <button
            type="button"
            className={`nav-item ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            <UserCircle2 size={19} />
            <span>Cuenta</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar-sm">{(user.email || 'U')[0].toUpperCase()}</div>
            <div className="sidebar-user-text">
              <strong>Autorizado</strong>
              <span>{user.email}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MOBILE TOP APP BAR */}
      <header className="mobile-header">
        <div className="mobile-brand">
          <div className="brand-icon-sm">
            <QrCode size={18} />
          </div>
          <strong>QR Studio Pro</strong>
        </div>
        <span className="mobile-pill">{records.length} QRs</span>
      </header>

      {/* MAIN CONTENT */}
      <main className="main-content">
        {activeTab === 'list' && (
          <QRList
            records={records}
            loading={loadingRecords}
            onCreateNew={handleOpenCreate}
            onEdit={handleOpenEdit}
          />
        )}

        {activeTab === 'studio' && (
          <QRStudio
            key={studioKey}
            userUid={user.uid}
            userEmail={user.email || ''}
            editingRecord={editingRecord}
            onSaved={handleSaved}
            onCancelEdit={() => {
              setEditingRecord(null);
              setActiveTab('list');
            }}
          />
        )}

        {activeTab === 'stats' && (
          <StatsView records={records} onEdit={handleOpenEdit} />
        )}

        {activeTab === 'account' && (
          <AccountView user={user} totalQrs={records.length} />
        )}
      </main>

      {/* MOBILE BOTTOM APP NAVIGATION */}
      <nav className="mobile-bottom-nav" aria-label="Navegación principal">
        <button
          type="button"
          className={`bottom-nav-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <LayoutGrid size={20} />
          <span>Mis QRs</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-btn ${activeTab === 'studio' ? 'active' : ''}`}
          onClick={handleOpenCreate}
        >
          <PlusCircle size={20} />
          <span>Crear</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart3 size={20} />
          <span>Stats</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-btn ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <UserCircle2 size={20} />
          <span>Cuenta</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
