import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  QrCode,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Ingresa tu correo electrónico y contraseña.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        setError('Usuario o contraseña incorrectos. Solo personal autorizado.');
      } else if (code === 'auth/invalid-email') {
        setError('El formato del correo electrónico no es válido.');
      } else if (code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intenta nuevamente en unos minutos.');
      } else if (code === 'auth/user-disabled') {
        setError('Esta cuenta fue deshabilitada por el administrador.');
      } else {
        setError('No se pudo iniciar sesión. Verifica tu conexión o configuración de Auth.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setInfo('');
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Escribe tu correo electrónico arriba para recibir el enlace de recuperación.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setInfo('Si el correo está autorizado, recibirás un enlace para restablecer tu contraseña.');
    } catch {
      setError('No se pudo enviar el correo de recuperación. Verifica la dirección.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-glow login-glow-1" />
      <div className="login-glow login-glow-2" />

      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo-box">
            <QrCode size={28} />
          </div>
          <div>
            <h1>QR Studio Pro</h1>
            <p>Plataforma Privada de Códigos QR Dinámicos</p>
          </div>
        </div>

        <div className="login-badge">
          <ShieldCheck size={15} />
          <span>Acceso restringido — Solo personas autorizadas</span>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div className="field-group">
            <label htmlFor="login-email">Correo electrónico</label>
            <div className="input-icon-wrap">
              <Mail size={17} className="input-icon" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="usuario@dominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor="login-password">Contraseña</label>
            <div className="input-icon-wrap">
              <Lock size={17} className="input-icon" />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className="input-eye-btn"
                onClick={() => setShowPass((v) => !v)}
                aria-label="Mostrar u ocultar contraseña"
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {info && (
            <div className="alert alert-success">
              <CheckCircle2 size={16} />
              <span>{info}</span>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            <span>{loading ? 'Verificando acceso...' : 'Iniciar Sesión'}</span>
            {!loading && <ArrowRight size={17} />}
          </button>
        </form>

        <div className="login-footer">
          <button
            type="button"
            className="link-btn"
            onClick={handleResetPassword}
            disabled={loading}
          >
            ¿Olvidaste tu contraseña?
          </button>
          <p className="login-hint">
            El registro público está desactivado. Solicita acceso al administrador.
          </p>
        </div>
      </div>
    </div>
  );
};
