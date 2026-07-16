import type { ReactNode } from 'react';
import {
  Bell,
  ChevronRight,
  CreditCard,
  FileText,
  Globe,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import type { AppViewId } from '../../navigation/appNavigation';
import { useAppContext } from '../../context/AppContext';
import { useWolfAssign } from '../../context/WolfAssignContext';
import { useTheme } from '../../context/ThemeContext';
import {
  BILLING_PLAN_LABEL,
  BILLING_PRO_PRICE_USD,
  athleteLimitLabel,
  resolveCoachPlan,
  setLocalCoachPlan,
  stripeCheckoutEnabled,
  stripeCheckoutUrl,
  type BillingPlanId,
} from '../../config/billing';
import './wl-account.css';

type AccountNavTarget = AppViewId | 'legal-terms' | 'legal-privacy';

type WlAccountViewProps = {
  isEs: boolean;
  language: 'ES' | 'EN';
  setLanguage: (lang: 'ES' | 'EN') => void;
  onLogout: () => void;
  onNavigate: (view: AccountNavTarget) => void;
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
  const { theme, setTheme } = useTheme();
  const { persona, currentUser, rosterForCoach, coachPrograms } = useWolfAssign();
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isCoach = currentUser?.role === 'coach' || isSuperAdmin;

  const displayName = currentUser?.name ?? (persona === 'athlete' ? 'Atleta' : 'Coach');
  const loginId = currentUser?.email ?? currentUser?.username ?? currentUser?.id ?? '—';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  const plan: BillingPlanId = resolveCoachPlan(currentUser?.id, currentUser?.billingPlan);
  const rosterCount = rosterForCoach(currentUser).length;
  const activePrograms =
    coachPrograms?.filter((p) => p.status === 'published' || p.status === 'draft').length ?? 0;

  const handleUpgrade = () => {
    if (!currentUser?.id) return;
    const checkout = stripeCheckoutUrl();
    if (stripeCheckoutEnabled() && checkout) {
      window.open(checkout, '_blank', 'noopener,noreferrer');
      return;
    }
    setLocalCoachPlan(currentUser.id, 'pro');
    window.location.reload();
  };

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
            icon={theme === 'light' ? Sun : Moon}
            label={isEs ? 'Apariencia' : 'Appearance'}
            hint={isEs ? 'Tema de la interfaz' : 'Interface theme'}
          >
            <div className="wl-account-lang" role="group" aria-label={isEs ? 'Tema' : 'Theme'}>
              <button
                type="button"
                className={`wl-account-lang__btn${theme === 'light' ? ' is-active' : ''}`}
                onClick={() => setTheme('light')}
              >
                {isEs ? 'Claro' : 'Light'}
              </button>
              <button
                type="button"
                className={`wl-account-lang__btn${theme === 'dark' ? ' is-active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                {isEs ? 'Oscuro' : 'Dark'}
              </button>
            </div>
          </AccountRow>
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
            hint={
              isEs
                ? 'Las alertas de cambio de plan ya llegan a atletas'
                : 'Plan-change alerts already reach athletes'
            }
            disabled
          />
        </AccountSection>

        {isCoach ? (
          <AccountSection title={isEs ? 'Plan' : 'Plan'}>
            <AccountRow
              icon={CreditCard}
              label={isEs ? `Plan ${BILLING_PLAN_LABEL[plan].es}` : `${BILLING_PLAN_LABEL[plan].en} plan`}
              hint={
                isEs
                  ? `Atletas ${rosterCount}/${athleteLimitLabel(plan, true)} · Programas ${activePrograms}${plan === 'free' ? '/1' : ''}`
                  : `Athletes ${rosterCount}/${athleteLimitLabel(plan, false)} · Programs ${activePrograms}${plan === 'free' ? '/1' : ''}`
              }
            >
              {plan === 'free' ? (
                <button type="button" className="wl-account-lang__btn is-active" onClick={handleUpgrade}>
                  {isEs ? `Upgrade Pro ($${BILLING_PRO_PRICE_USD}/mes)` : `Upgrade Pro ($${BILLING_PRO_PRICE_USD}/mo)`}
                </button>
              ) : (
                <span className="wl-account-row__hint">{isEs ? 'Activo' : 'Active'}</span>
              )}
            </AccountRow>
          </AccountSection>
        ) : null}

        <AccountSection title={isEs ? 'Legal' : 'Legal'}>
          <AccountRow
            icon={FileText}
            label={isEs ? 'Términos de uso' : 'Terms of use'}
            hint={isEs ? 'Leer documento' : 'Read document'}
            onClick={() => onNavigate('legal-terms')}
          />
          <AccountRow
            icon={FileText}
            label={isEs ? 'Política de privacidad' : 'Privacy policy'}
            hint={isEs ? 'Leer documento' : 'Read document'}
            onClick={() => onNavigate('legal-privacy')}
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
        <p className="wl-account-version">Wolf · v0.1.0</p>
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
