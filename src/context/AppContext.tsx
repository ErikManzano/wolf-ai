import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

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

export interface Exercise {
  id: number;
  name: string;
  sets: number;
  reps: string;
  load: string;
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
}

export interface IntakeData {
  id: number;
  athleteId?: number;
  date: string;
  responses: {
    // Biometrics
    weight: string;
    height: string;
    bodyFat: string;
    // 1RMs
    snatch: string;
    cleanJerk: string;
    deadlift: string;
    backSquat: string;
    frontSquat: string;
    // Other
    experience: string;
    goals: string;
  };
}

export interface Assignment {
  athleteId: number;
  programId: number;
  startDate: string; // ISO format YYYY-MM-DD
  personalizedProgram?: Program; // A copy of the program if adapted
  intakeId?: number;
}

interface AppContextType {
  microcycles: Microcycle[];
  setMicrocycles: React.Dispatch<React.SetStateAction<Microcycle[]>>;
  applyDeload: () => void;
  reduceVolume: () => void;
  
  athletes: Athlete[];
  addAthlete: (athlete: Omit<Athlete, 'id'>) => void;
  
  programs: Program[];
  addProgram: (program: Omit<Program, 'id'>) => void;
  
  assignments: Assignment[];
  assignProgram: (assignment: Assignment) => void;

  intakes: IntakeData[];
  submitIntake: (intake: Omit<IntakeData, 'id'>) => void;
}

const defaultContext: AppContextType = {
  microcycles: [],
  setMicrocycles: () => {},
  applyDeload: () => {},
  reduceVolume: () => {},
  athletes: [],
  addAthlete: () => {},
  programs: [],
  addProgram: () => {},
  assignments: [],
  assignProgram: () => {},
  intakes: [],
  submitIntake: () => {}
};

const AppContext = createContext<AppContextType>(defaultContext);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [microcycles, setMicrocycles] = useState<Microcycle[]>([
    { id: 1, week: 1, goal: 'Hipertrofia Funcional', vol: '12,500 kg', int: '70-75%' },
    { id: 2, week: 2, goal: 'Fuerza Base', vol: '14,200 kg', int: '75-80%' },
    { id: 3, week: 3, goal: 'Fuerza Máxima', vol: '11,800 kg', int: '85-90%' },
    { id: 4, week: 4, goal: 'Peaking', vol: '8,000 kg', int: '65-70%' },
  ]);

  const [athletes, setAthletes] = useState<Athlete[]>([
    { id: 1, name: 'Alex Rivera', level: 'Elite' },
    { id: 2, name: 'Sarah Chen', level: 'Advanced' }
  ]);

  const [programs, setPrograms] = useState<Program[]>([
    { 
      id: 101, 
      name: 'Olympic Weightlifting Block 1', 
      difficulty: 'Advanced',
      weeks: [
        {
          id: 1, weekNumber: 1, days: [
            { id: 11, dayNumber: 1, exercises: [
              { id: 111, name: 'Snatch', sets: 5, reps: '2', load: '80%' },
              { id: 112, name: 'Back Squat', sets: 5, reps: '5', load: '75%' }
            ]}
          ]
        }
      ]
    },
    { 
      id: 102, 
      name: 'Hypertrophy Base', 
      difficulty: 'Intermediate',
      weeks: [
        {
          id: 2, weekNumber: 1, days: [
            { id: 21, dayNumber: 1, exercises: [
              { id: 211, name: 'Bench Press', sets: 4, reps: '10', load: '65%' }
            ]}
          ]
        }
      ]
    }
  ]);

  const [intakes, setIntakes] = useState<IntakeData[]>([
    {
      id: 501,
      athleteId: 1,
      date: '2026-03-10',
      responses: {
        weight: '85', height: '180', bodyFat: '14',
        snatch: '100', cleanJerk: '125', deadlift: '200', backSquat: '160', frontSquat: '140',
        experience: '5 years', goals: 'National Championship'
      }
    }
  ]);

  const [assignments, setAssignments] = useState<Assignment[]>([
    { 
      athleteId: 1, 
      programId: 101, 
      startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      personalizedProgram: undefined // Will be filled when reassigned or adjusted
    }
  ]);

  const addAthlete = (athlete: Omit<Athlete, 'id'>) => {
    setAthletes(prev => [...prev, { ...athlete, id: Date.now() }]);
  };

  const addProgram = (program: Omit<Program, 'id'>) => {
    setPrograms(prev => [...prev, { ...program, id: Date.now() }]);
  };

  const submitIntake = (intake: Omit<IntakeData, 'id'>) => {
    const newIntake = { ...intake, id: Date.now() };
    setIntakes(prev => [...prev, newIntake]);
  };

  const calculatePersonalizedProgram = (athleteId: number, program: Program): Program => {
    const athleteIntake = intakes.find(i => i.athleteId === athleteId);
    if (!athleteIntake) return program;

    const { snatch, cleanJerk, deadlift, backSquat, frontSquat } = athleteIntake.responses;
    const rms: Record<string, number> = {
      'snatch': parseFloat(snatch) || 0,
      'clean & jerk': parseFloat(cleanJerk) || 0,
      'clean': (parseFloat(cleanJerk) || 0) * 0.9,
      'jerk': (parseFloat(cleanJerk) || 0) * 0.95,
      'deadlift': parseFloat(deadlift) || 0,
      'back squat': parseFloat(backSquat) || 0,
      'front squat': parseFloat(frontSquat) || 0,
      'squat': parseFloat(backSquat) || 0
    };

    return {
      ...program,
      weeks: program.weeks.map(week => ({
        ...week,
        days: week.days.map(day => ({
          ...day,
          exercises: day.exercises.map(ex => {
            if (ex.load.includes('%')) {
              const percentage = parseFloat(ex.load.replace('%', '')) / 100;
              const exerciseNameLower = ex.name.toLowerCase();
              let baseRM = 0;
              
              // Simple matching logic
              if (exerciseNameLower.includes('snatch')) baseRM = rms['snatch'];
              else if (exerciseNameLower.includes('clean') && exerciseNameLower.includes('jerk')) baseRM = rms['clean & jerk'];
              else if (exerciseNameLower.includes('clean')) baseRM = rms['clean'];
              else if (exerciseNameLower.includes('jerk')) baseRM = rms['jerk'];
              else if (exerciseNameLower.includes('back squat')) baseRM = rms['back squat'];
              else if (exerciseNameLower.includes('front squat')) baseRM = rms['front squat'];
              else if (exerciseNameLower.includes('squat')) baseRM = rms['squat'];
              else if (exerciseNameLower.includes('deadlift')) baseRM = rms['deadlift'];

              if (baseRM > 0) {
                const calculatedLoad = (baseRM * percentage).toFixed(1);
                return { ...ex, load: `${ex.load} (${calculatedLoad} kg)` };
              }
            }
            return ex;
          })
        }))
      }))
    };
  };

  const assignProgram = (assignment: Assignment) => {
    const program = programs.find(p => p.id === assignment.programId);
    let personalized = assignment.personalizedProgram;
    
    if (!personalized && program) {
      personalized = calculatePersonalizedProgram(assignment.athleteId, program);
    }

    setAssignments(prev => {
      const filtered = prev.filter(a => a.athleteId !== assignment.athleteId);
      return [...filtered, { ...assignment, personalizedProgram: personalized }];
    });
  };

  const applyDeload = () => {
    setMicrocycles(prev => prev.map(m => m.id === 4 ? { ...m, goal: 'Descarga', vol: '6,000 kg', int: '50-60%' } : m));
  };

  const reduceVolume = () => {
    setMicrocycles(prev => prev.map(m => ({ ...m, vol: `${(parseInt(m.vol.replace(/,/g, '')) * 0.85).toFixed(0)} kg` })));
  };

  return (
    <AppContext.Provider value={{ 
      microcycles, setMicrocycles, applyDeload, reduceVolume,
      athletes, addAthlete, programs, addProgram, assignments, assignProgram,
      intakes, submitIntake
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
