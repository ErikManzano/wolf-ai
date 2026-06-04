/** Public self-registration on login screen (disable in production). */
export const allowPublicRegister = import.meta.env.VITE_ALLOW_PUBLIC_REGISTER !== '0';

/** Demo quick-login buttons (hidden in production builds by default). */
export const showDemoQuickLogin =
  import.meta.env.VITE_SHOW_DEMO_LOGIN === '1' || !import.meta.env.PROD;
