import type { ReactNode } from 'react';
import {
  Bell,
  ChevronRight,
  FileText,
  Globe,
  LogOut,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import type { AppViewId } from '../../navigation/appNavigation';
import { useAppContext } from '../../context/AppContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import './wl-account.css';

type WlAccountViewProps = {
  isEs: boolean;
  language: 'ES' | 'EN';
  setLanguage: (lang: 'ES' | 'EN') => void;
  onLogout: () => void;
  onNavigate: (view: AppViewId) => void;
};

function roleLabel(
  isEs: boolean,
  role: string | undefined,
  persona: 'coach' | 'athlete',
): string {
  if (role === 'super_admin') return isEs ? 'Administrador' : 'Administrator';
  if (role === 'athlete' || persona === 'athlete') return isEs ? 'Atleta' : 'Athlete';
  return isEs ? 'Coach' : 'Coach';
}

export function WlAccountView({
  isEs,
  language,
  setLanguage,
  onLogout,
  onNavigate,
}: WlAccountViewProps) {
  const { userRole } = useAppContext();
  const { persona, currentUser } = useWolfAssign();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const displayName = currentUser?.name ?? (persona === 'athlete' ? 'Atleta' : 'Coach');
  const loginId = currentUser?.email ?? currentUser?.username ?? currentUser?.id ?? '—';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <section className="wl-account-view">
      <header className="wl-account-hero">
        <div className="wl-account-hero__avatar" aria-hidden>
          {userRole === 'admin' ? <ShieldCheck size={22} /> : initials || '?'}
        </div>
        <div className="wl-account-hero__body">
          <h1 className="wl-account-hero__name">{displayName}</h1>
          <p className="wl-account-hero__role">{roleLabel(isEs, currentUser?.role, persona)}</p>
          <p className="wl-account-hero__login">{loginId}</p>
        </div>
      </header>

      <div className="wl-account-sections">
        <AccountSection title={isEs ? 'Preferencias' : 'Preferences'}>
          <AccountRow
            icon={Globe}
            label={isEs ? 'Idioma' : 'Language'}
            hint={language === 'ES' ? 'Español' : 'English'}
          >
            <div className="wl-account-lang" role="group" aria-label={isEs ? 'Idioma' : 'Language'}>
              <button
                type="button"
                className={`wl-account-lang__btn${language === 'ES' ? ' is-active' : ''}`}
                onClick={() => setLanguage('ES')}
              >
                ES
              </button>
              <button
                type="button"
                className={`wl-account-lang__btn${language === 'EN' ? ' is-active' : ''}`}
                onClick={() => setLanguage('EN')}
              >
                EN
              </button>
            </div>
          </AccountRow>
          <AccountRow
            icon={Bell}
            label={isEs ? 'Notificaciones' : 'Notifications'}
            hint={isEs ? 'Próximamente' : 'Coming soon'}
            disabled
          />
        </AccountSection>

        <AccountSection title={isEs ? 'Ajustes' : 'Settings'}>
          <AccountRow
            icon={SlidersHorizontal}
            label={isEs ? 'Configuración general' : 'General settings'}
            hint={isEs ? 'Próximamente' : 'Coming soon'}
            disabled
          />
          <AccountRow
            icon={Shield}
            label={isEs ? 'Privacidad y seguridad' : 'Privacy & security'}
            hint={isEs ? 'Próximamente' : 'Coming soon'}
            disabled
          />
        </AccountSection>

        <AccountSection title={isEs ? 'Legal' : 'Legal'}>
          <AccountRow
            icon={FileText}
            label={isEs ? 'Términos de uso' : 'Terms of use'}
            hint={isEs ? 'Próximamente' : 'Coming soon'}
            disabled
          />
          <AccountRow
            icon={FileText}
            label={isEs ? 'Política de privacidad' : 'Privacy policy'}
            hint={isEs ? 'Próximamente' : 'Coming soon'}
            disabled
          />
        </AccountSection>

        {isSuperAdmin ? (
          <AccountSection title={isEs ? 'Administración' : 'Administration'}>
            <AccountRow
              icon={ShieldCheck}
              label={isEs ? 'Panel maestro' : 'Master panel'}
              hint={isEs ? 'Usuarios y permisos' : 'Users & permissions'}
              onClick={() => onNavigate('admin-users')}
            />
          </AccountSection>
        ) : null}
      </div>

      <footer className="wl-account-footer">
        <button type="button" className="wl-account-logout" onClick={onLogout}>
          <LogOut size={18} aria-hidden />
          {isEs ? 'Cerrar sesión' : 'Log out'}
        </button>
        <p className="wl-account-version">Wolf AI · v0.0.0</p>
      </footer>
    </section>
  );
}

function AccountSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="wl-account-section">
      <h2 className="wl-account-section__title">{title}</h2>
      <div className="wl-account-section__card">{children}</div>
    </section>
  );
}

function AccountRow({
  icon: Icon,
  label,
  hint,
  disabled,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  hint?: string;
  disabled?: boolean;
  onClick?: () => void;
  children?: ReactNode;
}) {
  const interactive = Boolean(onClick) && !disabled && !children;

  if (children) {
    return (
      <div className="wl-account-row wl-account-row--with-control">
        <span className="wl-account-row__icon" aria-hidden>
          <Icon size={18} />
        </span>
        <div className="wl-account-row__body">
          <span className="wl-account-row__label">{label}</span>
          {hint ? <span className="wl-account-row__hint">{hint}</span> : null}
        </div>
        <div className="wl-account-row__control">{children}</div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`wl-account-row${disabled ? ' wl-account-row--disabled' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="wl-account-row__icon" aria-hidden>
        <Icon size={18} />
      </span>
      <div className="wl-account-row__body">
        <span className="wl-account-row__label">{label}</span>
        {hint ? <span className="wl-account-row__hint">{hint}</span> : null}
      </div>
      {interactive ? <ChevronRight size={16} className="wl-account-row__chevron" aria-hidden /> : null}
    </button>
  );
}
