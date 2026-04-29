import React, { useMemo, useState } from 'react';
import { ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import './LoginScreen.css';

type LoginIdentity = {
  id: string;
  email: string;
  password: string;
  name: string;
  roleLabel: string;
};

interface LoginScreenProps {
  language: 'ES' | 'EN';
  identities: LoginIdentity[];
  onLogin: (userId: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ language, identities, onLogin }) => {
  const isEs = language === 'ES';
  const [email, setEmail] = useState(identities[0]?.email ?? '');
  const [password, setPassword] = useState(identities[0]?.password ?? '');
  const [error, setError] = useState('');

  const t = useMemo(
    () => ({
      title: isEs ? 'Bienvenido a Wolf AI' : 'Welcome to Wolf AI',
      subtitle: isEs
        ? 'Inicia sesión para gestionar atletas y planes WL en tiempo real.'
        : 'Sign in to manage athletes and WL plans in real time.',
      email: 'Email',
      password: isEs ? 'Contraseña' : 'Password',
      login: isEs ? 'Entrar al sistema' : 'Log in',
      quickAccess: isEs ? 'Acceso rápido de demo' : 'Demo quick access',
      invalid: isEs ? 'Credenciales inválidas para los usuarios demo.' : 'Invalid credentials for demo users.',
      mobileLead: isEs ? 'Planifica, asigna y monitorea en tiempo real.' : 'Plan, assign, and monitor in real time.',
      chipCoach: isEs ? 'Coach control' : 'Coach control',
      chipAthlete: isEs ? 'Vista atleta' : 'Athlete view',
      chipRealtime: isEs ? 'Demo multi-dispositivo' : 'Multi-device demo',
    }),
    [isEs],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const match = identities.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    );
    if (!match) {
      setError(t.invalid);
      return;
    }
    setError('');
    onLogin(match.id);
  };

  return (
    <div className="wolf-login">
      <div className="wolf-login-shell">
        <aside className="wolf-login-brand">
          <div className="wolf-login-logo">
            <ShieldCheck size={18} />
            <span>Wolf AI</span>
          </div>
          <h2>{isEs ? 'Motor Weightlifting' : 'Weightlifting Engine'}</h2>
          <p>
            {isEs
              ? 'Planificación inteligente para coaches y atletas de halterofilia.'
              : 'Smart planning for olympic lifting coaches and athletes.'}
          </p>
          <div className="wolf-login-quote">
            {isEs
              ? '“Optimiza cargas, controla versiones y asigna programas con velocidad.”'
              : '"Optimize loads, control versions, and assign programs faster."'}
          </div>
        </aside>

        <main className="wolf-login-form-wrap">
          <form className="wolf-login-form" onSubmit={handleSubmit}>
            <div className="wolf-login-mobile-visual" aria-hidden>
              <div className="wolf-login-mobile-visual-head">
                <Sparkles size={16} />
                <span>Wolf AI WL</span>
              </div>
              <p>{t.mobileLead}</p>
              <div className="wolf-login-mobile-chips">
                <span>{t.chipCoach}</span>
                <span>{t.chipAthlete}</span>
                <span>{t.chipRealtime}</span>
              </div>
            </div>

            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>

            <label>
              <span>{t.email}</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </label>
            <label>
              <span>{t.password}</span>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </label>

            {error && <p className="wolf-login-error">{error}</p>}

            <button type="submit" className="wolf-login-submit">
              {t.login}
            </button>

            <div className="wolf-login-divider">{t.quickAccess}</div>
            <div className="wolf-login-users">
              {identities.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="wolf-login-user-chip"
                  onClick={() => {
                    setEmail(u.email);
                    setPassword(u.password);
                    onLogin(u.id);
                  }}
                >
                  <UserRound size={14} />
                  <span>{u.name}</span>
                  <small>{u.roleLabel}</small>
                </button>
              ))}
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default LoginScreen;
