/**
 * Official Bulgarian-methodology exercise catalog (groups 1–14).
 * Merged with exercises.json in loadMockData; seeded to Exercise OS.
 */
import type { Exercise } from '../models/training';

type CatalogEntry = Exercise & { catalogGroup: string; nameEs?: string };

function e(
  id: string,
  name: string,
  catalogGroup: string,
  category: Exercise['category'],
  subtype: Exercise['subtype'],
  startPosition: Exercise['startPosition'],
  goal: Exercise['goal'],
  intensityRange: [number, number],
  opts?: Partial<Pick<Exercise, 'complexity' | 'loadAnchor' | 'loadScale' | 'tags'>> & { nameEs?: string },
): CatalogEntry {
  const complexity = opts?.complexity ?? (subtype === 'complex' ? 'complex' : 'single');
  const tags = [
    ...(opts?.tags ?? []),
    catalogGroup,
    category,
    subtype,
    startPosition,
  ];
  return {
    id,
    name,
    nameEs: opts?.nameEs,
    catalogGroup,
    category,
    subtype,
    startPosition,
    complexity,
    goal,
    intensityRange,
    tags,
    loadAnchor: opts?.loadAnchor,
    loadScale: opts?.loadScale,
  };
}

/** ~92 movements across 14 coach catalog groups. */
export const bulgarianCatalogEntries: CatalogEntry[] = [
  // Grupo 1 — Classic snatch (squat snatch) — ex-001 kept in exercises.json; alias for picker
  e('ex-wl-g01-01', 'Classic Snatch (Squat Snatch)', 'grupo_1', 'snatch', 'classic', 'floor', 'strength', [70, 92], {
    nameEs: 'Snatch clásico (sentadilla completa)',
    loadAnchor: 'snatch',
  }),

  // Grupo 2 — Classic snatch positional
  e('ex-wl-g02-01', 'Classic Snatch Below Knee', 'grupo_2', 'snatch', 'classic', 'below_knee', 'technique', [60, 85], {
    nameEs: 'Snatch clásico bajo rodilla',
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g02-02', 'Classic Snatch at Knee Height', 'grupo_2', 'snatch', 'classic', 'at_knee', 'technique', [60, 85], {
    nameEs: 'Snatch clásico a altura de rodilla',
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g02-03', 'Classic Snatch Above Knee', 'grupo_2', 'snatch', 'classic', 'above_knee', 'technique', [60, 85], {
    nameEs: 'Snatch clásico sobre rodilla',
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g02-04', 'Classic Snatch, Legs Straight', 'grupo_2', 'snatch', 'classic', 'straight_legs', 'technique', [55, 80], {
    nameEs: 'Snatch clásico piernas rectas',
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g02-05', 'Classic Snatch Standing Straight', 'grupo_2', 'snatch', 'classic', 'floor', 'technique', [50, 75], {
    nameEs: 'Snatch clásico de pie erguido',
    tags: ['standing'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g02-06', 'Classic Snatch on Blocks', 'grupo_2', 'snatch', 'classic', 'blocks', 'power', [70, 90], {
    nameEs: 'Snatch clásico en bloques',
    loadAnchor: 'snatch',
  }),

  // Grupo 3 — Power snatch
  e('ex-wl-g03-01', 'Power Snatch', 'grupo_3', 'snatch', 'power', 'floor', 'power', [65, 88], { loadAnchor: 'snatch' }),
  e('ex-wl-g03-02', 'Power Snatch Below Knee', 'grupo_3', 'snatch', 'power', 'below_knee', 'power', [65, 88], { loadAnchor: 'snatch' }),
  e('ex-wl-g03-03', 'Power Snatch at Knee Height', 'grupo_3', 'snatch', 'power', 'at_knee', 'power', [65, 88], { loadAnchor: 'snatch' }),
  e('ex-wl-g03-04', 'Power Snatch Above Knee', 'grupo_3', 'snatch', 'power', 'above_knee', 'power', [65, 88], { loadAnchor: 'snatch' }),
  e('ex-wl-g03-05', 'Power Snatch, Legs Straight', 'grupo_3', 'snatch', 'power', 'straight_legs', 'power', [60, 82], {
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g03-06', 'Power Snatch on Blocks', 'grupo_3', 'snatch', 'power', 'blocks', 'power', [70, 88], { loadAnchor: 'snatch' }),
  e('ex-wl-g03-07', 'Power Snatch & Overhead Squat', 'grupo_3', 'snatch', 'complex', 'floor', 'technique', [60, 82], {
    complexity: 'complex',
    loadAnchor: 'snatch',
  }),

  // Grupo 4 — Snatch pull
  e('ex-wl-g04-01', 'Snatch Pull', 'grupo_4', 'snatch', 'pull', 'floor', 'strength', [90, 110], {
    loadAnchor: 'snatch',
    loadScale: 1.05,
  }),
  e('ex-wl-g04-02', 'Snatch Pull from Below Knee', 'grupo_4', 'snatch', 'pull', 'below_knee', 'strength', [90, 110], {
    loadAnchor: 'snatch',
    loadScale: 1.05,
  }),
  e('ex-wl-g04-03', 'Snatch Pull at Knee Height', 'grupo_4', 'snatch', 'pull', 'at_knee', 'strength', [90, 110], {
    loadAnchor: 'snatch',
    loadScale: 1.05,
  }),
  e('ex-wl-g04-04', 'Snatch Pull from Above Knee', 'grupo_4', 'snatch', 'pull', 'above_knee', 'strength', [88, 108], {
    loadAnchor: 'snatch',
    loadScale: 1.05,
  }),
  e('ex-wl-g04-05', 'Snatch Pull to Knee (Deadlift)', 'grupo_4', 'snatch', 'pull', 'floor', 'strength', [95, 115], {
    nameEs: 'Snatch pull hasta rodilla (peso muerto)',
    loadAnchor: 'snatch',
    loadScale: 1.1,
  }),
  e('ex-wl-g04-06', 'Snatch Pull on Blocks', 'grupo_4', 'snatch', 'pull', 'blocks', 'strength', [90, 110], {
    loadAnchor: 'snatch',
    loadScale: 1.05,
  }),
  e('ex-wl-g04-07', 'Snatch Pull to Straight Legs', 'grupo_4', 'snatch', 'pull', 'straight_legs', 'strength', [85, 105], {
    loadAnchor: 'snatch',
    loadScale: 1.05,
  }),
  e('ex-wl-g04-08', 'Snatch Pull Slow + Fast', 'grupo_4', 'snatch', 'complex', 'floor', 'strength', [85, 105], {
    complexity: 'complex',
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g04-09', 'Snatch Pull to Knee + Snatch Pull', 'grupo_4', 'snatch', 'complex', 'floor', 'strength', [88, 108], {
    complexity: 'complex',
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g04-10', 'Snatch Pull + Slow Down', 'grupo_4', 'snatch', 'complex', 'floor', 'strength', [85, 105], {
    complexity: 'complex',
    tags: ['slow_eccentric'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g04-11', 'Snatch Pull Below Knee + Above Knee', 'grupo_4', 'snatch', 'complex', 'below_knee', 'strength', [85, 105], {
    complexity: 'complex',
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g04-12', 'Snatch Pull 4 Stops', 'grupo_4', 'snatch', 'pull', 'floor', 'strength', [80, 100], {
    tags: ['four_stops'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g04-13', 'Snatch Pull 4 Stop + Slow Down + Snatch Pull', 'grupo_4', 'snatch', 'complex', 'floor', 'strength', [80, 100], {
    complexity: 'complex',
    tags: ['four_stops', 'slow_eccentric'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g04-14', 'Snatch Pull + Classic Snatch', 'grupo_4', 'snatch', 'complex', 'floor', 'strength', [75, 92], {
    complexity: 'complex',
    loadAnchor: 'snatch',
  }),

  // Grupo 5 — Classic clean & jerk
  e('ex-wl-g05-01', 'Classic Clean & Jerk', 'grupo_5', 'clean_jerk', 'complex', 'floor', 'strength', [75, 92], {
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),

  // Grupo 6 — Classic C&J positional
  e('ex-wl-g06-01', 'Classic Clean & Jerk Below Knee', 'grupo_6', 'clean_jerk', 'complex', 'below_knee', 'technique', [70, 88], {
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g06-02', 'Classic Clean & Jerk at Knee Height', 'grupo_6', 'clean_jerk', 'complex', 'at_knee', 'technique', [70, 88], {
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g06-03', 'Classic Clean & Jerk Above Knee', 'grupo_6', 'clean_jerk', 'complex', 'above_knee', 'technique', [70, 88], {
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),

  // Grupo 7 — Power clean
  e('ex-wl-g07-01', 'Power Clean', 'grupo_7', 'clean_jerk', 'power', 'floor', 'power', [70, 88], { loadAnchor: 'clean_jerk' }),
  e('ex-wl-g07-02', 'Power Clean Below Knee', 'grupo_7', 'clean_jerk', 'power', 'below_knee', 'power', [70, 88], {
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g07-03', 'Power Clean at Knee Height', 'grupo_7', 'clean_jerk', 'power', 'at_knee', 'power', [70, 88], {
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g07-04', 'Power Clean Above Knee', 'grupo_7', 'clean_jerk', 'power', 'above_knee', 'power', [70, 88], {
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g07-05', 'Power Clean & Front Squat & Jerk', 'grupo_7', 'clean_jerk', 'complex', 'floor', 'strength', [72, 90], {
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g07-06', 'Power Clean & Power Jerk & Overhead Squat', 'grupo_7', 'clean_jerk', 'complex', 'floor', 'technique', [65, 85], {
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g07-07', 'Power Clean & Power Jerk', 'grupo_7', 'clean_jerk', 'complex', 'floor', 'power', [72, 90], {
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),

  // Grupo 8 — Jerk variations
  e('ex-wl-g08-01', 'Power Jerk off Rack', 'grupo_8', 'clean_jerk', 'power', 'rack', 'power', [75, 92], { loadAnchor: 'clean_jerk' }),
  e('ex-wl-g08-02', 'Power Jerk & Jerk off Rack', 'grupo_8', 'clean_jerk', 'complex', 'rack', 'strength', [78, 95], {
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g08-03', 'Clean Grip Power Jerk & Overhead Squat', 'grupo_8', 'clean_jerk', 'complex', 'rack', 'technique', [65, 85], {
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g08-04', 'Half Jerk & Jerk', 'grupo_8', 'clean_jerk', 'complex', 'rack', 'strength', [78, 95], {
    nameEs: 'Medio jerk y jerk',
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g08-05', 'Jerk off Rack', 'grupo_8', 'clean_jerk', 'classic', 'rack', 'strength', [80, 95], { loadAnchor: 'clean_jerk' }),
  e('ex-wl-g08-06', 'Behind the Neck Jerk off Rack', 'grupo_8', 'clean_jerk', 'classic', 'rack', 'strength', [75, 92], {
    tags: ['behind_neck'],
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g08-07', 'Back Squat & Behind the Neck Jerk', 'grupo_8', 'clean_jerk', 'complex', 'floor', 'strength', [70, 88], {
    complexity: 'complex',
    tags: ['behind_neck'],
    loadAnchor: 'back_squat',
  }),
  e('ex-wl-g08-08', 'Front Squat & Jerk', 'grupo_8', 'clean_jerk', 'complex', 'floor', 'strength', [72, 90], {
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),

  // Grupo 9 — Clean pull
  e('ex-wl-g09-01', 'Clean Pull', 'grupo_9', 'clean_jerk', 'pull', 'floor', 'strength', [95, 115], {
    loadAnchor: 'clean_jerk',
    loadScale: 1.05,
  }),
  e('ex-wl-g09-02', 'Clean Pull Below Knee', 'grupo_9', 'clean_jerk', 'pull', 'below_knee', 'strength', [95, 115], {
    loadAnchor: 'clean_jerk',
    loadScale: 1.05,
  }),
  e('ex-wl-g09-03', 'Clean Pull at Knee Height', 'grupo_9', 'clean_jerk', 'pull', 'at_knee', 'strength', [95, 115], {
    loadAnchor: 'clean_jerk',
    loadScale: 1.05,
  }),
  e('ex-wl-g09-04', 'Clean Pull Above Knee', 'grupo_9', 'clean_jerk', 'pull', 'above_knee', 'strength', [93, 112], {
    loadAnchor: 'clean_jerk',
    loadScale: 1.05,
  }),
  e('ex-wl-g09-05', 'Clean Pull to Knee (Deadlift)', 'grupo_9', 'clean_jerk', 'pull', 'floor', 'strength', [100, 120], {
    loadAnchor: 'clean_jerk',
    loadScale: 1.1,
  }),
  e('ex-wl-g09-06', 'Clean Pull on Blocks', 'grupo_9', 'clean_jerk', 'pull', 'blocks', 'strength', [95, 115], {
    loadAnchor: 'clean_jerk',
    loadScale: 1.05,
  }),
  e('ex-wl-g09-07', 'Clean Pull to Straight Legs', 'grupo_9', 'clean_jerk', 'pull', 'straight_legs', 'strength', [90, 110], {
    loadAnchor: 'clean_jerk',
    loadScale: 1.05,
  }),
  e('ex-wl-g09-08', 'Clean Pull Slow & Clean Pull', 'grupo_9', 'clean_jerk', 'complex', 'floor', 'strength', [90, 110], {
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g09-09', 'Clean Pull & Slow Eccentric', 'grupo_9', 'clean_jerk', 'complex', 'floor', 'strength', [88, 108], {
    complexity: 'complex',
    tags: ['slow_eccentric'],
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g09-10', 'Clean Pull Slow & Slow Eccentric', 'grupo_9', 'clean_jerk', 'complex', 'floor', 'strength', [85, 105], {
    complexity: 'complex',
    tags: ['slow_eccentric'],
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g09-11', 'Clean Pull with 4 Stops', 'grupo_9', 'clean_jerk', 'pull', 'floor', 'strength', [85, 105], {
    tags: ['four_stops'],
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g09-12', 'Clean Pull with 4 Stops & Clean Pull', 'grupo_9', 'clean_jerk', 'complex', 'floor', 'strength', [85, 105], {
    complexity: 'complex',
    tags: ['four_stops'],
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g09-13', 'Clean Pull with Medium Hand Spacing', 'grupo_9', 'clean_jerk', 'pull', 'floor', 'strength', [93, 112], {
    tags: ['medium_grip'],
    loadAnchor: 'clean_jerk',
    loadScale: 1.05,
  }),
  e('ex-wl-g09-14', 'Clean Pull to Knee & Clean Pull', 'grupo_9', 'clean_jerk', 'complex', 'floor', 'strength', [90, 110], {
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),
  e('ex-wl-g09-15', 'Clean Pull and Clean', 'grupo_9', 'clean_jerk', 'complex', 'floor', 'strength', [80, 95], {
    complexity: 'complex',
    loadAnchor: 'clean_jerk',
  }),

  // Grupo 10 — Squats
  e('ex-wl-g10-01', 'Back Squat', 'grupo_10', 'squat', 'classic', 'floor', 'strength', [70, 92], { loadAnchor: 'back_squat' }),
  e('ex-wl-g10-02', 'Front Squat', 'grupo_10', 'squat', 'classic', 'floor', 'strength', [70, 90], { loadAnchor: 'front_squat' }),
  e('ex-wl-g10-03', 'Back Squat Slow Lowering & Fast Rise', 'grupo_10', 'squat', 'classic', 'floor', 'strength', [65, 85], {
    tags: ['tempo'],
    loadAnchor: 'back_squat',
  }),
  e('ex-wl-g10-04', 'Bend Overs', 'grupo_10', 'accessory', 'classic', 'floor', 'strength', [40, 60], {
    nameEs: 'Inclinaciones (bend over)',
  }),

  // Grupo 11 — Good mornings / pulley
  e('ex-wl-g11-01', 'Snatch Grip Pulley Pull', 'grupo_11', 'accessory', 'pull', 'floor', 'strength', [50, 70], { loadAnchor: 'snatch' }),
  e('ex-wl-g11-02', 'Good Morning with Knee Flexed', 'grupo_11', 'accessory', 'classic', 'floor', 'strength', [40, 60]),
  e('ex-wl-g11-03', 'Good Morning Knees Flexed + Vertical Jump', 'grupo_11', 'accessory', 'complex', 'floor', 'power', [40, 55], {
    complexity: 'complex',
  }),

  // Grupo 12 — Pressing
  e('ex-wl-g12-01', 'Press', 'grupo_12', 'accessory', 'classic', 'floor', 'strength', [55, 75]),
  e('ex-wl-g12-02', 'Push Press', 'grupo_12', 'accessory', 'classic', 'floor', 'strength', [65, 85]),
  e('ex-wl-g12-03', 'Push Press & Overhead Squat', 'grupo_12', 'accessory', 'complex', 'floor', 'technique', [60, 80], {
    complexity: 'complex',
  }),
  e('ex-wl-g12-04', 'Behind the Neck Push Press & Overhead Squat', 'grupo_12', 'accessory', 'complex', 'floor', 'technique', [55, 78], {
    complexity: 'complex',
    tags: ['behind_neck'],
  }),
  e('ex-wl-g12-05', 'Snatch Grip Behind the Neck Push Press & OHS', 'grupo_12', 'accessory', 'complex', 'floor', 'technique', [55, 75], {
    complexity: 'complex',
    tags: ['behind_neck'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g12-06', 'Pressing Snatch Balance', 'grupo_12', 'snatch', 'power', 'at_knee', 'technique', [50, 75], { loadAnchor: 'snatch' }),
  e('ex-wl-g12-07', 'Bench Press (Clean Grip Wide)', 'grupo_12', 'accessory', 'classic', 'floor', 'strength', [50, 75], {
    nameEs: 'Press banca agarre clean abierto',
  }),

  // Grupo 13 — Additional loading (A.L.)
  e('ex-wl-g13-01', 'Back Squat with Heels Raised', 'grupo_13', 'squat', 'classic', 'floor', 'strength', [65, 85], {
    tags: ['al'],
    loadAnchor: 'back_squat',
  }),
  e('ex-wl-g13-02', 'Leg Press on Machine', 'grupo_13', 'accessory', 'classic', 'floor', 'strength', [60, 85], { tags: ['al'] }),
  e('ex-wl-g13-03', 'Lunge, Barbell on Shoulders', 'grupo_13', 'accessory', 'classic', 'floor', 'strength', [50, 70], { tags: ['al'] }),
  e('ex-wl-g13-04', 'Lunge, Barbell on Chest', 'grupo_13', 'accessory', 'classic', 'floor', 'strength', [50, 70], { tags: ['al'] }),
  e('ex-wl-g13-05', 'Lunge, Barbell Between Legs', 'grupo_13', 'accessory', 'classic', 'floor', 'strength', [50, 70], { tags: ['al'] }),
  e('ex-wl-g13-06', 'Vertical Jump, Snatch Grip Below Knees', 'grupo_13', 'accessory', 'classic', 'below_knee', 'power', [30, 50], {
    tags: ['al'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g13-07', 'Depth Jump', 'grupo_13', 'accessory', 'classic', 'floor', 'power', [0, 0], { tags: ['al', 'plyometric'] }),

  // Grupo 14 — Back
  e('ex-wl-g14-01', 'Hyperextension', 'grupo_14', 'accessory', 'classic', 'floor', 'strength', [40, 60], { tags: ['back'] }),
  e('ex-wl-g14-02', 'Good Morning, Legs Straight', 'grupo_14', 'accessory', 'classic', 'straight_legs', 'strength', [40, 60], {
    tags: ['back'],
  }),
  e('ex-wl-g14-03', 'Good Morning Seated on Floor', 'grupo_14', 'accessory', 'classic', 'floor', 'strength', [35, 55], { tags: ['back'] }),
  e('ex-wl-g14-04', 'Good Morning Seated on Bench', 'grupo_14', 'accessory', 'classic', 'floor', 'strength', [35, 55], { tags: ['back'] }),

  // Grupo 15 in plan = arms/shoulders (catalogGroup grupo_14 extension as grupo_15)
  e('ex-wl-g15-01', 'Snatch Grip Behind the Neck Press', 'grupo_15', 'accessory', 'classic', 'floor', 'strength', [50, 72], {
    tags: ['behind_neck', 'arms'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g15-02', 'Snatch Grip BTN Press + Overhead Squat', 'grupo_15', 'accessory', 'complex', 'floor', 'technique', [50, 72], {
    complexity: 'complex',
    tags: ['behind_neck', 'arms'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g15-03', 'Squat Snatch Press', 'grupo_15', 'snatch', 'classic', 'floor', 'technique', [45, 65], { tags: ['arms'], loadAnchor: 'snatch' }),
  e('ex-wl-g15-04', 'Seated Press', 'grupo_15', 'accessory', 'classic', 'floor', 'strength', [50, 70], { tags: ['arms'] }),
  e('ex-wl-g15-05', 'Incline Barbell Press', 'grupo_15', 'accessory', 'classic', 'floor', 'strength', [55, 75], { tags: ['arms'] }),
  e('ex-wl-g15-06', 'Clean Grip Straight Legged Snatch', 'grupo_15', 'snatch', 'classic', 'straight_legs', 'technique', [55, 78], {
    tags: ['arms'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g15-07', 'Snatch Grip Straight Legged Snatch', 'grupo_15', 'snatch', 'classic', 'straight_legs', 'technique', [55, 78], {
    tags: ['arms'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g15-08', 'Clean Grip Straight Legged Snatch & OHS', 'grupo_15', 'snatch', 'complex', 'straight_legs', 'technique', [55, 78], {
    complexity: 'complex',
    tags: ['arms'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g15-09', 'Clean Grip Straight Legged Snatch from Knee', 'grupo_15', 'snatch', 'classic', 'at_knee', 'technique', [55, 78], {
    tags: ['arms'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g15-10', 'Thumbless Snatch Grip SLS from Above Knee', 'grupo_15', 'snatch', 'classic', 'above_knee', 'technique', [50, 72], {
    tags: ['arms', 'thumbless'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g15-11', 'Clean Grip Straight Legged Snatch Above Knee', 'grupo_15', 'snatch', 'classic', 'above_knee', 'technique', [55, 78], {
    tags: ['arms'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g15-12', 'Snatch Grip Straight Legged Snatch Above Knee', 'grupo_15', 'snatch', 'classic', 'above_knee', 'technique', [55, 78], {
    tags: ['arms'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g15-13', 'Clean Grip SLS Legs & Torso Straight at Start', 'grupo_15', 'snatch', 'classic', 'straight_legs', 'technique', [50, 72], {
    tags: ['arms'],
    loadAnchor: 'snatch',
  }),
  e('ex-wl-g15-14', 'Snatch Grip SLS Legs & Torso Straight at Start', 'grupo_15', 'snatch', 'classic', 'straight_legs', 'technique', [50, 72], {
    tags: ['arms'],
    loadAnchor: 'snatch',
  }),
];
