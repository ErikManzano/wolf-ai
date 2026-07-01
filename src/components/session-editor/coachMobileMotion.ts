import type { Transition, Variants } from 'framer-motion';

export const COACH_MOBILE_SPRING: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 34,
  mass: 0.82,
};

export const COACH_MOBILE_SPRING_SOFT: Transition = {
  type: 'spring',
  stiffness: 360,
  damping: 32,
  mass: 0.9,
};

const OFF = { duration: 0.01 };

export type CoachNavDirection = 'forward' | 'back';

export function coachScreenMotion(
  reduceMotion: boolean | null,
  screen: 'sheet' | 'overview',
  nav: CoachNavDirection,
) {
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: OFF,
    };
  }

  if (screen === 'overview') {
    return {
      initial: { opacity: 0, x: 28 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: nav === 'back' ? 28 : 18 },
      transition: COACH_MOBILE_SPRING,
    };
  }

  if (nav === 'back') {
    return {
      initial: { opacity: 0, x: -28 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -18 },
      transition: COACH_MOBILE_SPRING,
    };
  }

  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, x: -18 },
    transition: COACH_MOBILE_SPRING,
  };
}

export const coachListStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export function coachListItemMotion(reduceMotion: boolean | null) {
  if (reduceMotion) {
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: OFF },
    };
  }
  return {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: COACH_MOBILE_SPRING_SOFT,
    },
  };
}

export function coachBlockExpandMotion(reduceMotion: boolean | null) {
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: OFF,
    };
  }
  return {
    initial: { opacity: 0, height: 0, y: -6 },
    animate: { opacity: 1, height: 'auto', y: 0 },
    exit: { opacity: 0, height: 0, y: -4 },
    transition: COACH_MOBILE_SPRING_SOFT,
  };
}

export function coachOverviewEnterMotion(reduceMotion: boolean | null) {
  if (reduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: OFF,
    };
  }
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: COACH_MOBILE_SPRING,
  };
}

export function coachModalMotion(reduceMotion: boolean | null) {
  if (reduceMotion) {
    return {
      overlay: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: OFF,
      },
      card: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: OFF,
      },
    };
  }
  return {
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
    },
    card: {
      initial: { opacity: 0, scale: 0.94, y: 16 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.96, y: 10 },
      transition: COACH_MOBILE_SPRING,
    },
  };
}
