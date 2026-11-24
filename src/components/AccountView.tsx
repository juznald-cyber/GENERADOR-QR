import React from 'react';
import { signOut, type User } from 'firebase/auth';
import { auth, QR_BASE_URL } from '../firebase';
import {
  LogOut,
  ShieldCheck,
  Smartphone,
  Users,
  Globe,
  ExternalLink,
} from 'lucide-react';

interface AccountViewProps {
  user: User;
  totalQrs: number;
}

export const AccountView: React.FC<AccountViewProps> = ({ user, totalQrs }) => {
  const handleSignOut = async () => {
    await signOut(auth);
  };

  return (
    <div className="account-container">
      <div className="section-header">
        <div>
          <h2>Cuenta y Acceso</h2>
          <p>Administra tu sesión y usuarios autorizados.</p>
        </div>
      </div>

      <div className="account-grid">
        <div className="panel-card">
          <div className="account-profile">
            <div className="avatar-circle">
              {(user.email || 'U')[0].toUpperCase()}
            </div>
            <div className="account-profile-info">
              <h3>Usuario Autorizado</h3>
              <p>{user.email}</p>
              <span className="status-dot-pill active">
                <ShieldCheck size={12} /> Sesión segura · {totalQrs} QRs activos
              </span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-danger-soft btn-full"
            onClick={handleSignOut}
            style={{ marginTop: 18 }}
          >
            <LogOut size={17} />
            <span>Cerrar sesión</span>
          </button>
        </div>

        <div className="panel-card">
          <div className="panel-title-row">
            <Smartphone size={18} />
            <h3>Usar como App en el Teléfono</h3>
          </div>
          <p className="muted-text" style={{ marginBottom: 10 }}>
            Esta plataforma está optimizada como aplicación móvil (PWA):
          </p>
          <ul className="guide-list">
            <li>
              <strong>Android (Chrome):</strong> Toca el menú ⋮ y selecciona{' '}
              <em>“Instalar aplicación”</em> o <em>“Añadir a pantalla de inicio”</em>.
            </li>
            <li>
              <strong>iPhone (Safari):</strong> Toca el botón <em>Compartir</em> y elige{' '}
              <em>“Agregar a inicio”</em>.
            </li>
          </ul>
        </div>

        <div className="panel-card">
          <div className="panel-title-row">
            <Users size={18} />
            <h3>Agregar personas autorizadas</h3>
          </div>
          <p className="muted-text" style={{ marginBottom: 12 }}>
            El registro público está bloqueado por seguridad. Para autorizar a
            otra persona, crea su correo y contraseña desde Firebase Auth:
          </p>
          <a
            href="https://console.firebase.google.com/project/generador-qr-96098/authentication/users"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-full"
          >
            <span>Abrir Usuarios en Firebase</span>
            <ExternalLink size={15} />
          </a>
        </div>

        <div className="panel-card">
          <div className="panel-title-row">
            <Globe size={18} />
            <h3>Dominio de tus QRs</h3>
          </div>
          <p className="muted-text">
            Todos tus códigos apuntan permanentemente a:
          </p>
          <div className="domain-pill">{QR_BASE_URL}/r/codigo</div>
        </div>
      </div>
    </div>
  );
};
