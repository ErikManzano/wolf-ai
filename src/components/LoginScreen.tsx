import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  Dumbbell,
  LineChart,
  Clock,
  Eye,
  EyeOff,
  Calendar,
  Shield,
  ArrowLeft,
  ChevronRight,
  Mail,
  Lock,
  Smartphone,
  User,
} from 'lucide-react';
import './LoginScreen.css';

const MOBILE_MQ = '(max-width: 900px)';
const ONB_STORAGE_KEY = 'wolf-mobile-onb';

interface LoginScreenProps {
  language: 'ES' | 'EN';
  onLogin: (params: { email: string; password: string }) => Promise<string | null> | string | null;
  onRegister: (params: { name: string; email: string; password: string; role: 'coach' | 'athlete' }) => Promise<string | null> | string | null;
  onChangePassword: (params: { email: string; currentPassword: string; newPassword: string }) => Promise<string | null> | string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ language, onLogin, onRegister, onChangePassword }) => {
  const isEs = language === 'ES';
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePhase, setMobilePhase] = useState<'onboarding' | 'get-started' | 'auth'>(() => {
    if (typeof window === 'undefined') return 'onboarding';
    try {
      if (window.matchMedia(MOBILE_MQ).matches && sessionStorage.getItem(ONB_STORAGE_KEY) === '1') {
        return 'get-started';
      }
    } catch {
      /* ignore */
    }
    return 'onboarding';
  });
  const [onbIndex, setOnbIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const [tab, setTab] = useState<'login' | 'register' | 'change-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerRole, setRegisterRole] = useState<'coach' | 'athlete'>('athlete');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const t = useMemo(
    () => ({
      brandHeadline: isEs ? 'Motor de planificación para halterofilia' : 'Planning engine for weightlifting',
      brandSub: isEs
        ? 'Organiza, ajusta y controla los planes de tus atletas de forma simple y eficiente.'
        : 'Organize, adjust, and control your athletes’ plans simply and efficiently.',
      feat1Title: isEs ? 'Planifica mejor' : 'Plan smarter',
      feat1Desc: isEs ? 'Programas adaptados a cada atleta.' : 'Programs tailored to each athlete.',
      feat2Title: isEs ? 'Controla el progreso' : 'Track progress',
      feat2Desc: isEs ? 'Seguimiento claro y en tiempo real.' : 'Clear, real-time tracking.',
      feat3Title: isEs ? 'Ahorra tiempo' : 'Save time',
      feat3Desc: isEs ? 'Menos tareas, más rendimiento.' : 'Less busywork, more performance.',
      loginTitle: isEs ? 'Iniciar sesión' : 'Sign in',
      loginSubtitle: isEs ? 'Accede para gestionar atletas y planes.' : 'Sign in to manage athletes and plans.',
      registerTitle: isEs ? 'Registrarse' : 'Register',
      registerSubtitle: isEs ? 'Crea tu cuenta para gestionar atletas y planes.' : 'Create your account to manage athletes and plans.',
      changePasswordTitle: isEs ? 'Cambiar contraseña' : 'Change password',
      changePasswordSubtitle: isEs
        ? 'Introduce tu email y contraseñas para actualizar el acceso.'
        : 'Enter your email and passwords to update access.',
      email: isEs ? 'Email' : 'Email',
      password: isEs ? 'Contraseña' : 'Password',
      login: isEs ? 'Entrar al sistema' : 'Log in',
      loginCta: isEs ? 'Iniciar sesión' : 'Sign in',
      register: isEs ? 'Registrarse' : 'Register',
      createAccount: isEs ? 'Crear cuenta' : 'Create account',
      updatePassword: isEs ? 'Actualizar contraseña' : 'Update password',
      name: isEs ? 'Nombre completo' : 'Full name',
      role: isEs ? 'Rol' : 'Role',
      roleCoach: isEs ? 'Coach' : 'Coach',
      roleAthlete: isEs ? 'Atleta' : 'Athlete',
      currentPassword: isEs ? 'Contraseña actual' : 'Current password',
      newPassword: isEs ? 'Nueva contraseña' : 'New password',
      passwordHint: isEs ? 'Mínimo 6 caracteres' : 'Minimum 6 characters',
      forgotPassword: isEs ? '¿Olvidaste tu contraseña?' : 'Forgot your password?',
      noAccount: isEs ? '¿No tienes cuenta?' : 'No account yet?',
      noAccountShort: isEs ? '¿No tienes cuenta?' : 'No account?',
      haveAccount: isEs ? '¿Ya tienes cuenta?' : 'Already have an account?',
      backToLogin: isEs ? 'Volver a iniciar sesión' : 'Back to sign in',
      emailPh: isEs ? 'tu@email.com' : 'you@email.com',
      passwordPh: isEs ? 'Tu contraseña' : 'Your password',
      toggleShow: isEs ? 'Mostrar contraseña' : 'Show password',
      toggleHide: isEs ? 'Ocultar contraseña' : 'Hide password',
      onbWelcomeLead1: isEs ? 'Planifica. Controla.' : 'Plan. Track.',
      onbWelcomeLead2: isEs ? 'Mejora.' : 'Improve.',
      onbWelcomeSub: isEs
        ? 'El compañero digital para coaches y atletas de halterofilia.'
        : 'Your digital partner for weightlifting coaches and athletes.',
      onbManageTitle: isEs ? 'Gestiona todo en un solo lugar' : 'Manage everything in one place',
      onbManageSub: isEs
        ? 'Calendarios, planes y asignaciones sin perder el hilo.'
        : 'Calendars, plans, and assignments—always in sync.',
      onbPerfTitle: isEs ? 'Controla el rendimiento' : 'Track performance',
      onbPerfSub: isEs
        ? 'Visualiza cargas, tendencias y decisiones con claridad.'
        : 'See loads, trends, and decisions with clarity.',
      onbSecureTitle: isEs ? 'Tus datos, siempre seguros' : 'Your data, always secure',
      onbSecureSub: isEs
        ? 'Acceso protegido y buenas prácticas para tu equipo.'
        : 'Protected access and solid practices for your team.',
      getStartedTitle: isEs ? '¡Listo para empezar!' : 'Ready to get started!',
      getStartedSub: isEs
        ? 'Elige cómo quieres continuar.'
        : 'Choose how you’d like to continue.',
      continueGoogle: isEs ? 'Continuar con Google' : 'Continue with Google',
      continueEmail: isEs ? 'Continuar con email' : 'Continue with email',
      continuePhone: isEs ? 'Continuar con teléfono' : 'Continue with phone',
      signInLink: isEs ? 'Iniciar sesión' : 'Sign in',
      orContinue: isEs ? 'o continúa con' : 'or continue with',
      soon: isEs ? 'Próximamente' : 'Coming soon',
      brandShort: isEs ? 'Wolf' : 'Wolf',
    }),
    [isEs],
  );

  const onboardingSlides = useMemo(
    () => [
      { key: 'welcome', variant: 'welcome' as const },
      {
        key: 'manage',
        variant: 'feature' as const,
        Icon: Calendar,
        title: t.onbManageTitle,
        sub: t.onbManageSub,
      },
      {
        key: 'perf',
        variant: 'feature' as const,
        Icon: LineChart,
        title: t.onbPerfTitle,
        sub: t.onbPerfSub,
      },
      {
        key: 'secure',
        variant: 'feature' as const,
        Icon: Shield,
        title: t.onbSecureTitle,
        sub: t.onbSecureSub,
      },
    ],
    [t],
  );

  const finishOnboarding = useCallback(() => {
    try {
      sessionStorage.setItem(ONB_STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setMobilePhase('get-started');
  }, []);

  const goNextOnboarding = useCallback(() => {
    if (onbIndex < onboardingSlides.length - 1) {
      setOnbIndex((i) => i + 1);
    } else {
      finishOnboarding();
    }
  }, [onbIndex, onboardingSlides.length, finishOnboarding]);

  const onOnbTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    setTouchStartX(null);
    if (dx < -48 && onbIndex < onboardingSlides.length - 1) {
      setOnbIndex((i) => i + 1);
    } else if (dx > 48 && onbIndex > 0) {
      setOnbIndex((i) => i - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await onLogin({ email: email.trim(), password });
    setLoading(false);
    if (result) {
      setError(result);
      return;
    }
    setError('');
    setSuccess('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await onRegister({
      name: registerName.trim(),
      email: email.trim(),
      password,
      role: registerRole,
    });
    setLoading(false);
    if (result) {
      setError(result);
      setSuccess('');
      return;
    }
    setError('');
    setSuccess(isEs ? 'Cuenta creada. Ya puedes iniciar sesión.' : 'Account created. You can sign in now.');
    setTab('login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await onChangePassword({
      email: email.trim(),
      currentPassword,
      newPassword,
    });
    setLoading(false);
    if (result) {
      setError(result);
      setSuccess('');
      return;
    }
    setError('');
    setSuccess(isEs ? 'Contraseña actualizada correctamente.' : 'Password updated successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setTab('login');
  };

  const formTitle =
    tab === 'login' ? t.loginTitle : tab === 'register' ? t.registerTitle : t.changePasswordTitle;
  const formSubtitle =
    tab === 'login' ? t.loginSubtitle : tab === 'register' ? t.registerSubtitle : t.changePasswordSubtitle;

  const submitLabel =
    loading
      ? isEs
        ? 'Procesando...'
        : 'Processing...'
      : tab === 'login'
        ? isMobile
          ? t.loginCta
          : t.login
        : tab === 'register'
          ? t.createAccount
          : t.updatePassword;

  const showSocialRow = isMobile && tab === 'login';

  const formBody = (
    <>
      {!isMobile && (
        <header className="wolf-login-form-header">
          <h1>{formTitle}</h1>
          <p>{formSubtitle}</p>
        </header>
      )}

      {isMobile && (
        <header className="wolf-login-form-header wolf-login-form-header--mobile">
          <h1>{formTitle}</h1>
          <p>{formSubtitle}</p>
        </header>
      )}

      {tab === 'register' && (
        <>
          <label className="wolf-login-label">
            <span>{t.name}</span>
            {isMobile ? (
              <div className="wolf-login-input-icon-wrap">
                <User className="wolf-login-input-prefix" size={18} strokeWidth={2} aria-hidden />
                <input value={registerName} onChange={(e) => setRegisterName(e.target.value)} type="text" required />
              </div>
            ) : (
              <input value={registerName} onChange={(e) => setRegisterName(e.target.value)} type="text" required />
            )}
          </label>
          <label className="wolf-login-label">
            <span>{t.role}</span>
            <select value={registerRole} onChange={(e) => setRegisterRole(e.target.value as 'coach' | 'athlete')}>
              <option value="athlete">{t.roleAthlete}</option>
              <option value="coach">{t.roleCoach}</option>
            </select>
          </label>
        </>
      )}

      <label className="wolf-login-label">
        <span>{t.email}</span>
        {isMobile ? (
          <div className="wolf-login-input-icon-wrap">
            <Mail className="wolf-login-input-prefix" size={18} strokeWidth={2} aria-hidden />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder={t.emailPh}
              required
            />
          </div>
        ) : (
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            placeholder={t.emailPh}
            required
          />
        )}
      </label>

      {tab === 'change-password' ? (
        <>
          <label className="wolf-login-label">
            <span>{t.currentPassword}</span>
            {isMobile ? (
              <div className="wolf-login-input-icon-wrap">
                <Lock className="wolf-login-input-prefix" size={18} strokeWidth={2} aria-hidden />
                <input
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
            ) : (
              <input
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
              />
            )}
          </label>
          <label className="wolf-login-label">
            <span>{t.newPassword}</span>
            {isMobile ? (
              <div className="wolf-login-input-icon-wrap wolf-login-input-adorned">
                <Lock className="wolf-login-input-prefix" size={18} strokeWidth={2} aria-hidden />
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                />
              </div>
            ) : (
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
              />
            )}
          </label>
          <small className="wolf-login-hint">{t.passwordHint}</small>
        </>
      ) : (
        <>
          <label className="wolf-login-label">
            <span>{t.password}</span>
            {isMobile ? (
              <div className="wolf-login-input-icon-wrap wolf-login-input-adorned">
                <Lock className="wolf-login-input-prefix" size={18} strokeWidth={2} aria-hidden />
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                  placeholder={t.passwordPh}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="wolf-login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t.toggleHide : t.toggleShow}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                </button>
              </div>
            ) : (
              <div className="wolf-login-input-adorned">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={tab === 'register' ? 'new-password' : 'current-password'}
                  placeholder={t.passwordPh}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="wolf-login-password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t.toggleHide : t.toggleShow}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
                </button>
              </div>
            )}
          </label>
          {tab === 'login' && (
            <div className="wolf-login-forgot-row">
              <button type="button" className="wolf-login-link" onClick={() => setTab('change-password')}>
                {t.forgotPassword}
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'change-password' && (
        <div className="wolf-login-alt-row">
          <button type="button" className="wolf-login-link" onClick={() => setTab('login')}>
            {t.backToLogin}
          </button>
        </div>
      )}

      {error && <p className="wolf-login-error">{error}</p>}
      {success && <p className="wolf-login-success">{success}</p>}

      <button type="submit" className="wolf-login-submit" disabled={loading}>
        {submitLabel}
      </button>

      {showSocialRow && (
        <>
          <div className="wolf-login-divider wolf-login-divider--muted">
            <span>{t.orContinue}</span>
          </div>
          <div className="wolf-login-social-row">
            <button type="button" className="wolf-login-social-tile" aria-label="Google" title={t.soon} disabled>
              <span className="wolf-login-social-g">G</span>
            </button>
            <button type="button" className="wolf-login-social-tile wolf-login-social-tile--apple" aria-label="Apple" title={t.soon} disabled>
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden className="wolf-login-apple-svg">
                <path
                  fill="currentColor"
                  d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
                />
              </svg>
            </button>
          </div>
        </>
      )}

      {!isMobile && tab === 'login' && (
        <>
          <div className="wolf-login-divider">
            <span>{t.noAccount}</span>
          </div>
          <button type="button" className="wolf-login-btn-secondary" onClick={() => setTab('register')}>
            {t.register}
          </button>
        </>
      )}

      {!isMobile && tab === 'register' && (
        <>
          <div className="wolf-login-divider">
            <span>{t.haveAccount}</span>
          </div>
          <button type="button" className="wolf-login-btn-secondary" onClick={() => setTab('login')}>
            {t.login}
          </button>
        </>
      )}

      {isMobile && tab === 'login' && (
        <p className="wolf-login-mobile-footer">
          {t.noAccountShort}{' '}
          <button type="button" className="wolf-login-link wolf-login-link--inline" onClick={() => setTab('register')}>
            {t.register}
          </button>
        </p>
      )}

      {isMobile && tab === 'register' && (
        <p className="wolf-login-mobile-footer">
          {t.haveAccount}{' '}
          <button type="button" className="wolf-login-link wolf-login-link--inline" onClick={() => setTab('login')}>
            {t.signInLink}
          </button>
        </p>
      )}
    </>
  );

  const currentSlide = onboardingSlides[onbIndex];

  if (isMobile) {
    return (
      <div className="wolf-login wolf-login--mobile-root">
        {mobilePhase === 'onboarding' && (
          <div
            className="wolf-login-onb"
            onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
            onTouchEnd={onOnbTouchEnd}
          >
            {currentSlide.variant === 'welcome' && (
              <div className="wolf-login-onb-slide wolf-login-onb-slide--welcome">
                <div className="wolf-login-onb-welcome-bg" aria-hidden />
                <div className="wolf-login-onb-welcome-inner">
                  <div className="wolf-login-logo wolf-login-logo--onb">
                    <ShieldCheck size={22} strokeWidth={2} aria-hidden />
                    <span>{t.brandShort}</span>
                  </div>
                  <h2 className="wolf-login-onb-headline">
                    <span className="wolf-login-onb-headline-line">{t.onbWelcomeLead1}</span>{' '}
                    <span className="wolf-login-onb-headline-accent">{t.onbWelcomeLead2}</span>
                  </h2>
                  <p className="wolf-login-onb-sub">{t.onbWelcomeSub}</p>
                </div>
              </div>
            )}

            {currentSlide.variant === 'feature' && (
              <div className="wolf-login-onb-slide wolf-login-onb-slide--feature">
                <div className="wolf-login-onb-icon-ring">
                  {(() => {
                    const OnbIcon = currentSlide.Icon;
                    return <OnbIcon className="wolf-login-onb-icon" size={32} strokeWidth={1.75} aria-hidden />;
                  })()}
                </div>
                <h2 className="wolf-login-onb-feature-title">{currentSlide.title}</h2>
                <p className="wolf-login-onb-sub">{currentSlide.sub}</p>
              </div>
            )}

            <div className="wolf-login-onb-footer">
              <div className="wolf-login-onb-dots" role="tablist" aria-label={isEs ? 'Progreso' : 'Progress'}>
                {onboardingSlides.map((s, i) => (
                  <button
                    key={s.key}
                    type="button"
                    role="tab"
                    aria-selected={i === onbIndex}
                    className={`wolf-login-onb-dot ${i === onbIndex ? 'active' : ''}`}
                    onClick={() => setOnbIndex(i)}
                  />
                ))}
              </div>
              <button type="button" className="wolf-login-onb-next" onClick={goNextOnboarding} aria-label={isEs ? 'Siguiente' : 'Next'}>
                <ChevronRight size={22} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {mobilePhase === 'get-started' && (
          <div className="wolf-login-get-started">
            <div className="wolf-login-get-started-brand">
              <div className="wolf-login-logo wolf-login-logo--get-started" aria-hidden>
                <ShieldCheck size={24} strokeWidth={2} />
                <span>Wolf AI</span>
              </div>
            </div>
            <h2 className="wolf-login-get-started-title">{t.getStartedTitle}</h2>
            <p className="wolf-login-get-started-sub">{t.getStartedSub}</p>
            <div className="wolf-login-get-started-actions">
              <button type="button" className="wolf-login-btn-google" disabled title={t.soon}>
                <span className="wolf-login-btn-google-mark" aria-hidden>
                  G
                </span>
                {t.continueGoogle}
              </button>
              <button
                type="button"
                className="wolf-login-btn-outline-icon"
                onClick={() => {
                  setTab('register');
                  setMobilePhase('auth');
                }}
              >
                <Mail size={20} strokeWidth={2} aria-hidden />
                {t.continueEmail}
              </button>
              <button type="button" className="wolf-login-btn-outline-icon" disabled title={t.soon}>
                <Smartphone size={20} strokeWidth={2} aria-hidden />
                {t.continuePhone}
              </button>
            </div>
            <p className="wolf-login-get-started-footer">
              {t.haveAccount}{' '}
              <button
                type="button"
                className="wolf-login-link wolf-login-link--inline"
                onClick={() => {
                  setTab('login');
                  setMobilePhase('auth');
                }}
              >
                {t.signInLink}
              </button>
            </p>
          </div>
        )}

        {mobilePhase === 'auth' && (
          <div className="wolf-login-mobile-auth">
            <div className="wolf-login-mobile-auth-top">
              <button
                type="button"
                className="wolf-login-mobile-back"
                onClick={() => {
                  setError('');
                  if (tab === 'change-password') {
                    setTab('login');
                    return;
                  }
                  setMobilePhase('get-started');
                }}
                aria-label={isEs ? 'Volver' : 'Back'}
              >
                <ArrowLeft size={22} strokeWidth={2} />
              </button>
            </div>
            <div className="wolf-login-mobile-auth-logo">
              <ShieldCheck size={40} strokeWidth={1.75} aria-hidden />
            </div>
            <form
              className="wolf-login-form wolf-login-form--mobile"
              onSubmit={tab === 'login' ? handleSubmit : tab === 'register' ? handleRegister : handleChangePassword}
            >
              {formBody}
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="wolf-login">
      <div className="wolf-login-shell">
        <aside className="wolf-login-brand">
          <div className="wolf-login-brand-top">
            <div className="wolf-login-logo">
              <ShieldCheck size={22} strokeWidth={2} aria-hidden />
              <span>Wolf AI</span>
            </div>
            <h2 className="wolf-login-headline">
              {t.brandHeadline}
              <span className="wolf-login-headline-dot">.</span>
            </h2>
            <p className="wolf-login-lead">{t.brandSub}</p>
            <div className="wolf-login-accent-line" aria-hidden />
          </div>
          <div className="wolf-login-features">
            <div className="wolf-login-feature">
              <Dumbbell className="wolf-login-feature-icon" size={22} strokeWidth={2} aria-hidden />
              <div>
                <strong>{t.feat1Title}</strong>
                <span>{t.feat1Desc}</span>
              </div>
            </div>
            <div className="wolf-login-feature">
              <LineChart className="wolf-login-feature-icon" size={22} strokeWidth={2} aria-hidden />
              <div>
                <strong>{t.feat2Title}</strong>
                <span>{t.feat2Desc}</span>
              </div>
            </div>
            <div className="wolf-login-feature">
              <Clock className="wolf-login-feature-icon" size={22} strokeWidth={2} aria-hidden />
              <div>
                <strong>{t.feat3Title}</strong>
                <span>{t.feat3Desc}</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="wolf-login-form-wrap">
          <form
            className="wolf-login-form"
            onSubmit={tab === 'login' ? handleSubmit : tab === 'register' ? handleRegister : handleChangePassword}
          >
            {formBody}
          </form>
        </main>
      </div>
    </div>
  );
};

export default LoginScreen;
