import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface Microcycle {
  id: number;
  week: number;
  goal: string;
  vol: string;
  int: string;
}

export interface Athlete {
  id: number;
  name: string;
  level: string;
}

export interface ExerciseSet {
  id: number;
  load: string;
  reps: string;
  repeat: number;
  completed?: boolean;
  actualLoad?: string;
  actualReps?: string;
}

export interface Exercise {
  id: number;
  name: string;
  sets: number | string;
  reps: string;
  load: string;
  prescription?: string;
  isComplex?: boolean;
  complexParts?: string[];
  seriesRows?: ExerciseSet[];
  notes?: string;
  actualLoad?: string;
  actualReps?: string;
  tonnage?: number;
}

export interface LibraryExercise {
  id: number;
  name: string;
  description: string;
  category: string;
  image?: string;
  video?: string;
  muscles?: string[];
  cues?: string[];
}

export interface ExerciseCategory {
  name: string;
  exercises: LibraryExercise[];
}

export interface TrainingDay {
  id: number;
  dayNumber: number;
  exercises: Exercise[];
}

export interface TrainingWeek {
  id: number;
  weekNumber: number;
  days: TrainingDay[];
}

export interface Program {
  id: number;
  name: string;
  weeks: TrainingWeek[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Elite';
  groupIds?: number[];
}

export interface IntakeData {
  id: number;
  athleteId?: number;
  date: string;
  /** Nota opcional (p. ej. petición del coach al pedir nueva tanda de Stats). */
  coachNote?: string;
  responses: {
    weight: string;
    height: string;
    bodyFat: string;
    snatch: string;
    cleanJerk: string;
    deadlift: string;
    backSquat: string;
    frontSquat: string;
    experience: string;
    goals: string;
  };
}

const STORAGE_INTAKES = 'wolf_intakes_v1';

function seedIntakesDefault(): IntakeData[] {
  return [
    {
      id: 501,
      athleteId: 1,
      date: '2026-01-12',
      coachNote: 'Registro inicial',
      responses: {
        weight: '76',
        height: '178',
        bodyFat: '12',
        snatch: '82',
        cleanJerk: '105',
        deadlift: '170',
        backSquat: '145',
        frontSquat: '118',
        experience: '4 años halterofilia',
        goals: 'Regional 2026',
      },
    },
    {
      id: 502,
      athleteId: 1,
      date: '2026-02-08',
      responses: {
        weight: '78',
        height: '178',
        bodyFat: '11',
        snatch: '88',
        cleanJerk: '108',
        deadlift: '185',
        backSquat: '152',
        frontSquat: '122',
        experience: '4 años halterofilia',
        goals: 'Progreso snatch',
      },
    },
    {
      id: 503,
      athleteId: 1,
      date: '2026-03-10',
      coachNote: 'Ivan Hellequin — revisión pre-competición',
      responses: {
        weight: '78',
        height: '180',
        bodyFat: '14',
        snatch: '100',
        cleanJerk: '125',
        deadlift: '200',
        backSquat: '160',
        frontSquat: '140',
        experience: '5 años',
        goals: 'Campeonato nacional',
      },
    },
  ];
}

export interface Assignment {
  athleteId: number;
  programId: number;
  startDate: string;
  personalizedProgram?: Program;
  intakeId?: number;
}

export interface CustomExerciseGroup {
  id: number;
  name: string;
  exercises: number[];
  difficultyLevel?: string;
}

export type UserRole = 'coach' | 'admin';

interface AppContextType {
  microcycles: Microcycle[];
  setMicrocycles: React.Dispatch<React.SetStateAction<Microcycle[]>>;
  applyDeload: () => void;
  reduceVolume: () => void;
  athletes: Athlete[];
  archivedAthletes: Athlete[];
  addAthlete: (athlete: Omit<Athlete, 'id'>) => void;
  updateAthlete: (athleteId: number, updates: Partial<Omit<Athlete, 'id'>>) => void;
  removeAthlete: (athleteId: number) => void;
  restoreAthlete: (athleteId: number) => void;
  programs: Program[];
  addProgram: (program: Omit<Program, 'id'>) => void;
  updateProgram: (programId: number, updates: Partial<Program>) => void;
  updateProgramStructure: (programId: number, weekNumber: number, dayNumber: number, exercises: Exercise[]) => void;
  assignments: Assignment[];
  assignProgram: (assignment: Assignment) => void;
  intakes: IntakeData[];
  submitIntake: (intake: Omit<IntakeData, 'id'>) => void;
  exerciseLibrary: ExerciseCategory[];
  updateExerciseLog: (athleteId: number, programId: number, weekNumber: number, dayNumber: number, exerciseId: number, actualLoad: string, actualReps: string) => void;
  selectedExerciseId: number | null;
  setSelectedExerciseId: (id: number | null) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  customGroups: CustomExerciseGroup[];
  createCustomGroup: (name: string) => void;
  addToCustomGroup: (groupId: number, exerciseId: number) => void;
  addMasterExercise: (categoryName: string, exercise: Omit<LibraryExercise, 'id'>) => void;
  addExerciseToProgramSession: (athleteId: number, weekNumber: number, dayNumber: number, exercise: LibraryExercise) => void;
  selectedWeek: number;
  setSelectedWeek: (week: number) => void;
  addWeekToProgram: (programId: number) => void;
  removeWeekFromProgram: (programId: number, weekNumber: number) => void;
  addDayToWeek: (programId: number, weekNumber: number) => void;
  removeDayFromWeek: (programId: number, weekNumber: number, dayNumber: number) => void;
  duplicateWeek: (programId: number, weekNumberToCopy: number) => void;
  loadDemoData: () => void;
}

const defaultContext: AppContextType = {
  microcycles: [],
  setMicrocycles: () => { },
  applyDeload: () => { },
  reduceVolume: () => { },
  athletes: [],
  archivedAthletes: [],
  addAthlete: () => { },
  updateAthlete: () => { },
  removeAthlete: () => { },
  restoreAthlete: () => { },
  programs: [],
  addProgram: () => { },
  updateProgram: () => { },
  updateProgramStructure: () => { },
  assignments: [],
  assignProgram: () => { },
  intakes: [],
  submitIntake: () => { },
  exerciseLibrary: [],
  updateExerciseLog: () => { },
  selectedExerciseId: null,
  setSelectedExerciseId: () => { },
  userRole: 'coach',
  setUserRole: () => { },
  customGroups: [],
  createCustomGroup: () => { },
  addToCustomGroup: () => { },
  addMasterExercise: () => { },
  addExerciseToProgramSession: () => { },
  selectedWeek: 1,
  setSelectedWeek: () => { },
  addWeekToProgram: () => { },
  removeWeekFromProgram: () => { },
  addDayToWeek: () => { },
  removeDayFromWeek: () => { },
  duplicateWeek: () => { },
  loadDemoData: () => { }
};

const AppContext = createContext<AppContextType>(defaultContext);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [microcycles, setMicrocycles] = useState<Microcycle[]>([
    { id: 1, week: 1, goal: 'Hipertrofia Funcional', vol: '12,500 kg', int: '70-75%' },
    { id: 2, week: 2, goal: 'Fuerza Base', vol: '14,200 kg', int: '75-80%' },
    { id: 3, week: 3, goal: 'Fuerza Máxima', vol: '11,800 kg', int: '85-90%' },
    { id: 4, week: 4, goal: 'Peaking', vol: '8,000 kg', int: '65-70%' },
  ]);

  const [programs, setPrograms] = useState<Program[]>(() => {
    const saved = localStorage.getItem('wolf_programs');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 101,
        name: 'Powerlifting Peaking (12 Wks)',
        difficulty: 'Elite',
        weeks: Array.from({ length: 12 }).map((_, wIdx) => ({
          id: 200 + wIdx,
          weekNumber: wIdx + 1,
          days: Array.from({ length: 4 }).map((_, dIdx) => ({
            id: 2000 + wIdx * 10 + dIdx,
            dayNumber: dIdx + 1,
            exercises: [
              { id: 20000 + wIdx * 100 + dIdx * 10 + 1, name: dIdx % 2 === 0 ? 'Back Squat' : 'Deadlift', sets: 4, reps: wIdx > 8 ? '2' : '5', load: `${75 + (wIdx * 2)}%` },
              { id: 20000 + wIdx * 100 + dIdx * 10 + 2, name: 'Bench Press', sets: 5, reps: wIdx > 8 ? '3' : '5', load: `${70 + (wIdx * 2)}%` },
              { id: 20000 + wIdx * 100 + dIdx * 10 + 3, name: 'Pull Ups', sets: 3, reps: '8', load: 'BW' },
              { id: 20000 + wIdx * 100 + dIdx * 10 + 4, name: 'Plank', sets: 3, reps: '60s', load: 'BW' }
            ]
          }))
        }))
      },
      {
        id: 102,
        name: 'Cross Training Engine Building',
        difficulty: 'Advanced',
        weeks: Array.from({ length: 8 }).map((_, wIdx) => ({
          id: 400 + wIdx,
          weekNumber: wIdx + 1,
          days: Array.from({ length: 5 }).map((_, dIdx) => ({
            id: 4000 + wIdx * 10 + dIdx,
            dayNumber: dIdx + 1,
            exercises: [
              { id: 40000 + wIdx * 100 + dIdx * 10 + 1, name: 'Power Cleans', sets: 5, reps: '3', load: '70%' },
              { id: 40000 + wIdx * 100 + dIdx * 10 + 2, name: 'Assault Bike Sprint', sets: 6, reps: '30s', load: 'MAX' },
              { id: 40000 + wIdx * 100 + dIdx * 10 + 3, name: 'Burpee Box Jumps', sets: 4, reps: '12', load: 'BW' }
            ]
          }))
        }))
      },
      {
        id: 103,
        name: 'Intermediate Halterofilia (12 Wks)',
        difficulty: 'Intermediate',
        groupIds: [1],
        weeks: [
          {
            id: 300,
            weekNumber: 1,
            days: [
              {
                id: 3000,
                dayNumber: 1,
                exercises: [
                  {
                    id: 30001, name: 'Clean & Jerk', sets: '', reps: '', load: '',
                    isComplex: true,
                    complexParts: ['Clean', 'Jerk'],
                    seriesRows: [
                      { id: 1, load: '60%', reps: '2+2', repeat: 1 },
                      { id: 2, load: '65%', reps: '2+2', repeat: 1 },
                      { id: 3, load: '70%', reps: '2+2', repeat: 2 },
                      { id: 4, load: '75%', reps: '2+2', repeat: 2 },
                      { id: 5, load: '85%', reps: '1+1', repeat: 1 },
                    ]
                  },
                  {
                    id: 30002, name: 'Power Snatch & BTN Push Press & OHS', sets: '', reps: '', load: '',
                    isComplex: true,
                    complexParts: ['Power Snatch', 'Behind the Neck Push Press', 'Overhead Squat'],
                    seriesRows: [
                      { id: 6, load: '60%', reps: '3+3+3', repeat: 1 },
                      { id: 7, load: '65%', reps: '3+3+3', repeat: 1 },
                      { id: 8, load: '70%', reps: '3+3+3', repeat: 2 },
                    ]
                  },
                  {
                    id: 30003, name: 'Back Squat', sets: '', reps: '', load: '',
                    seriesRows: [
                      { id: 9, load: '70%', reps: '5', repeat: 1 },
                      { id: 10, load: '75%', reps: '3', repeat: 2 },
                      { id: 11, load: '80%', reps: '2', repeat: 2 },
                    ]
                  },
                  { id: 30004, name: 'Snatch Pull', sets: 3, reps: '3', load: '90%' },
                ]
              }
            ]
          }
        ]
      }
    ];
  });

  const [athletes, setAthletes] = useState<Athlete[]>(() => {
    const saved = localStorage.getItem('wolf_athletes');
    if (saved) return JSON.parse(saved);
    return [
      { id: 1, name: 'Erik Manzano', level: 'Elite' },
      { id: 2, name: 'Laura Méndez', level: 'Advanced' },
    ];
  });
  const [archivedAthletes, setArchivedAthletes] = useState<Athlete[]>(() => {
    const saved = localStorage.getItem('wolf_athletes_archived');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    const saved = localStorage.getItem('wolf_assignments');
    if (saved) return JSON.parse(saved);
    return [
      {
        athleteId: 1,
        programId: 101,
        startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        personalizedProgram: undefined
      }
    ];
  });

  const [intakes, setIntakes] = useState<IntakeData[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_INTAKES);
      if (raw) {
        const parsed = JSON.parse(raw) as IntakeData[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      /* ignore */
    }
    return seedIntakesDefault();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_INTAKES, JSON.stringify(intakes));
    } catch {
      /* ignore */
    }
  }, [intakes]);

  const [exerciseLibrary] = useState<ExerciseCategory[]>([
    {
      name: 'Olympic Weightlifting',
      exercises: [
        { id: 1001, name: 'Snatch', description: 'Classic olympic snatch', category: 'Olympic', muscles: ['Full Body', 'Shoulders', 'Hips'], cues: ['Keep bar close', 'Aggressive extension', 'Fast under'], image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80' },
        { id: 1002, name: 'Clean & Jerk', description: 'Classic clean and jerk', category: 'Olympic', muscles: ['Full Body', 'Quads', 'Triceps'], cues: ['Drive with legs', 'Vertical chest', 'Split balanced'], image: 'https://images.unsplash.com/photo-1541534741688-6078c64b591d?w=800&q=80' },
        { id: 1003, name: 'Power Snatch', description: 'Snatch caught above parallel', category: 'Olympic', muscles: ['Shoulders', 'Hips'], cues: ['Stay over the bar', 'Aggressive punch up'] },
        { id: 1004, name: 'Hang Clean', description: 'Clean from the hang position', category: 'Olympic', muscles: ['Traps', 'Hips'], cues: ['Set the back', 'Fast elbows'] },
        { id: 1005, name: 'Muscle Snatch', description: 'No dip snatch', category: 'Olympic' },
        { id: 1006, name: 'Snatch Balance', description: 'Landing speed drill', category: 'Olympic' },
        { id: 1007, name: 'Jerk Balance', description: 'Footwork drill', category: 'Olympic' },
        { id: 1008, name: 'Power Clean', description: 'Catch above parallel', category: 'Olympic' },
        { id: 1009, name: 'Clean High Pull', description: 'Power development', category: 'Olympic' },
        { id: 1010, name: 'Snatch Deadlift', description: 'Positional strength', category: 'Olympic' },
      ]
    },
    {
      name: 'Powerlifting Base',
      exercises: [
        { id: 2001, name: 'Back Squat', description: 'Low or high bar back squat', category: 'Power', muscles: ['Quads', 'Glutes', 'Lower Back'], cues: ['Big breath', 'Drive knees out', 'Chest up'], image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' },
        { id: 2002, name: 'Bench Press', description: 'Flat bench press', category: 'Power', muscles: ['Chest', 'Triceps', 'Shoulders'], cues: ['Feet planted', 'Arch slightly', 'Bar to sternum'] },
        { id: 2003, name: 'Deadlift', description: 'Conventional or Sumo deadlift', category: 'Power', muscles: ['Hamstrings', 'Back', 'Grip'], cues: ['Flat back', 'Pull slack out', 'Drive with legs'] },
        { id: 2004, name: 'Front Squat', description: 'Barbell front squat', category: 'Power', muscles: ['Quads', 'Core', 'Upper Back'], cues: ['Elbows high', 'Upright torso'] },
        { id: 2005, name: 'Pause Squat', description: 'Depth control', category: 'Power' },
        { id: 2006, name: 'OHP', description: 'Overhead Press', category: 'Power' },
        { id: 2007, name: 'Sumo Deadlift', description: 'Wide stance pull', category: 'Power' },
        { id: 2008, name: 'Incline Bench', description: 'Upper chest focus', category: 'Power' },
        { id: 2009, name: 'Box Squat', description: 'Posterior chain focus', category: 'Power' },
        { id: 2010, name: 'Good Mornings', description: 'Hinge strength', category: 'Power' },
      ]
    },
    {
      name: 'Bodyweight & Accs',
      exercises: [
        { id: 3001, name: 'Pull Ups', description: 'Strict or weighted pull ups', category: 'Accs', muscles: ['Lats', 'Biceps'] },
        { id: 3002, name: 'Dips', description: 'Tricep and chest focused dips', category: 'Accs', muscles: ['Triceps', 'Chest'] },
        { id: 3003, name: 'Lunges', description: 'Walking or stationary lunges', category: 'Accs', muscles: ['Quads', 'Glutes'] },
        { id: 3007, name: 'Plank', description: 'Core stability', category: 'Accs' },
      ]
    },
    {
      name: 'Mobility & Prep',
      exercises: Array.from({ length: 20 }).map((_, i) => ({
        id: 4000 + i,
        name: `Mobility Drill ${i + 1}`,
        description: 'Specific joint preparation',
        category: 'Mobility'
      }))
    },
    {
      name: 'Explosive & Jumps',
      exercises: Array.from({ length: 20 }).map((_, i) => ({
        id: 5000 + i,
        name: `Dynamic Jump ${i + 1}`,
        description: 'RFD development drill',
        category: 'Explosive'
      }))
    },
    {
      name: 'Kettlebell & Functional',
      exercises: Array.from({ length: 25 }).map((_, i) => ({
        id: 6000 + i,
        name: `Functional Flow ${i + 1}`,
        description: 'Multi-planar movement',
        category: 'Functional'
      }))
    }
  ]);

  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [userRole, setUserRole] = useState<UserRole>('coach');
  const [customGroups] = useState<CustomExerciseGroup[]>([
    { id: 1, name: 'Halterofilia Nivel 1 (Técnica)', exercises: [1006, 1007, 1009] }
  ]);
  const [exerciseLibraryState] = useState<ExerciseCategory[]>(exerciseLibrary);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('wolf_programs', JSON.stringify(programs));
  }, [programs]);

  useEffect(() => {
    localStorage.setItem('wolf_athletes', JSON.stringify(athletes));
  }, [athletes]);

  useEffect(() => {
    localStorage.setItem('wolf_athletes_archived', JSON.stringify(archivedAthletes));
  }, [archivedAthletes]);

  useEffect(() => {
    localStorage.setItem('wolf_assignments', JSON.stringify(assignments));
  }, [assignments]);

  const addAthlete = (athlete: Omit<Athlete, 'id'>) => {
    setAthletes(prev => [...prev, { ...athlete, id: Date.now() }]);
  };

  const updateAthlete = (athleteId: number, updates: Partial<Omit<Athlete, 'id'>>) => {
    setAthletes((prev) => prev.map((a) => (a.id === athleteId ? { ...a, ...updates } : a)));
  };

  const removeAthlete = (athleteId: number) => {
    setAthletes((prev) => {
      const target = prev.find((a) => a.id === athleteId);
      if (!target) return prev;
      setArchivedAthletes((archivedPrev) =>
        archivedPrev.some((a) => a.id === athleteId) ? archivedPrev : [...archivedPrev, target],
      );
      return prev.filter((a) => a.id !== athleteId);
    });
    setAssignments((prev) => prev.filter((a) => a.athleteId !== athleteId));
  };

  const restoreAthlete = (athleteId: number) => {
    setArchivedAthletes((prev) => {
      const target = prev.find((a) => a.id === athleteId);
      if (!target) return prev;
      setAthletes((athPrev) => (athPrev.some((a) => a.id === athleteId) ? athPrev : [...athPrev, target]));
      return prev.filter((a) => a.id !== athleteId);
    });
  };

  const addProgram = (program: Omit<Program, 'id'>) => {
    setPrograms(prev => [...prev, { ...program, id: Date.now() }]);
  };

  const updateProgram = (programId: number, updates: Partial<Program>) => {
    setPrograms(prev => prev.map(p => p.id === programId ? { ...p, ...updates } : p));
  };

  const updateProgramStructure = (programId: number, weekNumber: number, dayNumber: number, exercises: Exercise[]) => {
    setPrograms(prev => prev.map(p => {
      if (p.id !== programId) return p;
      return {
        ...p,
        weeks: p.weeks.map(w => {
          if (w.weekNumber !== weekNumber) return w;
          return {
            ...w,
            days: w.days.map(d => {
              if (d.dayNumber !== dayNumber) return d;
              return { ...d, exercises };
            })
          };
        })
      };
    }));
  };

  const addWeekToProgram = (programId: number) => {
    setPrograms(prev => prev.map(p => {
      if (p.id !== programId) return p;
      const nextWeekNum = p.weeks.length + 1;
      return {
        ...p,
        weeks: [...p.weeks, { id: Date.now(), weekNumber: nextWeekNum, days: [{ id: Date.now() + 1, dayNumber: 1, exercises: [] }] }]
      };
    }));
  };

  const removeWeekFromProgram = (programId: number, weekNumber: number) => {
    setPrograms(prev => prev.map(p => {
      if (p.id !== programId) return p;
      return { ...p, weeks: p.weeks.filter(w => w.weekNumber !== weekNumber).map((w, i) => ({ ...w, weekNumber: i + 1 })) };
    }));
  };

  const duplicateWeek = (programId: number, weekNumberToCopy: number) => {
    setPrograms(prev => prev.map(p => {
      if (p.id !== programId) return p;
      const week = p.weeks.find(w => w.weekNumber === weekNumberToCopy);
      if (!week) return p;
      return {
        ...p,
        weeks: [...p.weeks, { ...JSON.parse(JSON.stringify(week)), id: Date.now(), weekNumber: p.weeks.length + 1 }]
      };
    }));
  };

  const addDayToWeek = (programId: number, weekNumber: number) => {
    setPrograms(prev => prev.map(p => {
      if (p.id !== programId) return p;
      return {
        ...p,
        weeks: p.weeks.map(w => {
          if (w.weekNumber !== weekNumber) return w;
          return { ...w, days: [...w.days, { id: Date.now(), dayNumber: w.days.length + 1, exercises: [] }] };
        })
      };
    }));
  };

  const removeDayFromWeek = (programId: number, weekNumber: number, dayNumber: number) => {
    setPrograms(prev => prev.map(p => {
      if (p.id !== programId) return p;
      return {
        ...p,
        weeks: p.weeks.map(w => {
          if (w.weekNumber !== weekNumber) return w;
          return { ...w, days: w.days.filter(d => d.dayNumber !== dayNumber).map((d, i) => ({ ...d, dayNumber: i + 1 })) };
        })
      };
    }));
  };

  const calculatePersonalizedProgram = (athleteId: number, program: Program): Program => {
    const intake = intakes.find(i => i.athleteId === athleteId);
    if (!intake) return program;
    const { snatch, cleanJerk, deadlift, backSquat, frontSquat } = intake.responses;
    const rms: Record<string, number> = {
      'snatch': parseFloat(snatch) || 0,
      'clean & jerk': parseFloat(cleanJerk) || 0,
      'deadlift': parseFloat(deadlift) || 0,
      'back squat': parseFloat(backSquat) || 0,
      'front squat': parseFloat(frontSquat) || 0,
    };
    return {
      ...program,
      weeks: program.weeks.map(w => ({
        ...w,
        days: w.days.map(d => ({
          ...d,
          exercises: d.exercises.map(ex => {
            if (ex.load.includes('%')) {
              const perc = parseFloat(ex.load) / 100;
              const name = ex.name.toLowerCase();
              let rm = 0;
              if (name.includes('snatch')) rm = rms['snatch'];
              else if (name.includes('clean')) rm = rms['clean & jerk'];
              else if (name.includes('squat')) rm = rms['back squat'];
              if (rm > 0) return { ...ex, load: `${ex.load} (${(rm * perc).toFixed(1)}kg)` };
            }
            return ex;
          })
        }))
      }))
    };
  };

  const assignProgram = (assignment: Assignment) => {
    const program = programs.find(p => p.id === assignment.programId);
    if (!program) return;
    const personalized = calculatePersonalizedProgram(assignment.athleteId, program);
    setAssignments(prev => [...prev.filter(a => a.athleteId !== assignment.athleteId), { ...assignment, personalizedProgram: personalized }]);
  };

  const updateExerciseLog = (athleteId: number, programId: number, weekNumber: number, dayNumber: number, exerciseId: number, actualLoad: string, actualReps: string) => {
    setAssignments(prev => prev.map(a => {
      if (a.athleteId === athleteId && (a.programId === programId || (a.personalizedProgram && a.personalizedProgram.id === programId))) {
        const prog = a.personalizedProgram;
        if (!prog) return a;
        return {
          ...a,
          personalizedProgram: {
            ...prog,
            weeks: prog.weeks.map(w => {
              if (w.weekNumber !== weekNumber) return w;
              return {
                ...w,
                days: w.days.map(d => {
                  if (d.dayNumber !== dayNumber) return d;
                  return {
                    ...d,
                    exercises: d.exercises.map(ex => {
                      if (ex.id !== exerciseId) return ex;
                      const tonnage = (parseFloat(actualLoad) || 0) * (parseInt(actualReps) || 0) * 1;
                      return { ...ex, actualLoad, actualReps, tonnage };
                    })
                  };
                })
              };
            })
          }
        };
      }
      return a;
    }));
  };

  const loadDemoData = () => {
    const demoProgramId = 999;
    /** Atleta principal de la demo (coincide con seed `wolf_athletes`). */
    const demoAthleteId = 1;

    const demoProgram: Program = {
      id: demoProgramId,
      name: 'Elite Snatch Specialization',
      difficulty: 'Elite',
      weeks: [{
        id: Date.now() + 10,
        weekNumber: 1,
        days: [{
          id: Date.now() + 11,
          dayNumber: 1,
          exercises: [
            { id: 1, name: 'Snatch', sets: 5, reps: '2', load: '80%' },
            { id: 2, name: 'Snatch Pull', sets: 3, reps: '3', load: '95%' },
            { id: 3, name: 'Back Squat', sets: 4, reps: '5', load: '75%' }
          ]
        }]
      }]
    };
    const demoAthlete: Athlete = { id: demoAthleteId, name: 'Erik Manzano', level: 'Elite' };

    setPrograms(prev => [...prev.filter(p => p.id !== demoProgramId), demoProgram]);
    setAthletes(prev => [...prev.filter(a => a.id !== demoAthleteId), demoAthlete]);

    setTimeout(() => {
      assignProgram({
        athleteId: demoAthleteId,
        programId: demoProgramId,
        startDate: new Date().toISOString().split('T')[0]
      });
    }, 200);
  };

  const applyDeload = () => { };
  const reduceVolume = () => { };
  const submitIntake = useCallback((payload: Omit<IntakeData, 'id'>) => {
    setIntakes((prev) => [...prev, { ...payload, id: Date.now() + Math.floor(Math.random() * 1000) }]);
  }, []);
  const createCustomGroup = () => { };
  const addToCustomGroup = () => { };
  const addMasterExercise = () => { };
  const addExerciseToProgramSession = () => { };

  return (
    <AppContext.Provider value={{
      microcycles, setMicrocycles, applyDeload, reduceVolume,
      athletes, archivedAthletes, addAthlete, updateAthlete, removeAthlete, restoreAthlete,
      programs, addProgram, updateProgram, updateProgramStructure, assignments, assignProgram,
      intakes, submitIntake, exerciseLibrary: exerciseLibraryState, updateExerciseLog,
      selectedExerciseId, setSelectedExerciseId,
      userRole, setUserRole, customGroups, createCustomGroup, addToCustomGroup, addMasterExercise,
      addExerciseToProgramSession, selectedWeek, setSelectedWeek,
      addWeekToProgram, removeWeekFromProgram, addDayToWeek, removeDayFromWeek, duplicateWeek,
      loadDemoData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
