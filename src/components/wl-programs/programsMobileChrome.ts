export const WL_PROGRAMS_MOBILE_CREATE_CHROME = 'wolf:programs-mobile-create-chrome';

export function setProgramsMobileCreateVisible(visible: boolean) {
  window.dispatchEvent(
    new CustomEvent(WL_PROGRAMS_MOBILE_CREATE_CHROME, { detail: { visible } }),
  );
}
