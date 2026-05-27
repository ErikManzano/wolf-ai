import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardList,
  Dumbbell,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { mockAthletes } from '../data/loadMockData';
import { normalizeBlockType, resolveBaseOneRm } from '../services/trainingEngine';
import { useWolfAssign } from '../context/WolfAssignContext';
import { countCompletedExercises, countProgramExercises } from '../utils/completionHelpers';
import './AthleteTrainingView.css';
import '../styles/interactive.css';


function dayKey(weekNumber: number, dayNumber: number): string {
  return `w${weekNumber}-d${dayNumber}`;
}

interface AthleteTrainingViewProps {
  language: 'ES' | 'EN';
}

const AthleteTrainingView: React.FC<AthleteTrainingViewProps> = ({ language }) => {
  const isEs = language === 'ES';
  const {
    myAssignment,
    completions,
    toggleSessionComplete,
    isSessionComplete,
    toggleExerciseComplete,
    isExerciseComplete,
    motorExercises,
  } = useWolfAssign();

  const exName = useCallback(
    (id: string) => motorExercises.find((e) => e.id === id)?.name ?? id,
    [motorExercises],
  );
  const [week, setWeek] = useState(1);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const athleteProfile = useMemo(
    () => mockAthletes.find((a) => a.id === myAssignment?.athleteProfileId),
    [myAssignment?.athleteProfileId],
  );

  const program = myAssignment?.program;
  const weekData = program?.weeks.find((w) => w.weekNumber === week);

  const totalExercises = useMemo(() => (program ? countProgramExercises(program) : 0), [program]);

  const completedExercises = useMemo(() => {
    if (!myAssignment || !program) return 0;
    return countCompletedExercises(completions, myAssignment.id, program);
  }, [completions, myAssignment, program]);

  const disciplinePct =
    totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  const t = useMemo(
    () => ({
      kicker: isEs ? 'Tu semana de entreno' : 'Your training week',
      title: isEs ? 'Mi plan WL' : 'My WL plan',
      discipline: isEs ? 'Disciplina' : 'Discipline',
      exercisesDone: isEs ? 'ejercicios hechos' : 'exercises done',
      weekOf: isEs ? 'Semana' : 'Week',
      of: isEs ? 'de' : 'of',
      markDone: isEs ? 'Marcar realizada' : 'Mark done',
      markExercise: isEs ? 'Marcar ejercicio' : 'Mark exercise',
      exerciseDone: isEs ? 'Realizado' : 'Done',
      done: isEs ? 'Realizada' : 'Done',
      reps: isEs ? 'reps' : 'reps',
      kg: 'kg',
      complex: isEs ? 'Complejo' : 'Complex',
      expandDay: isEs ? 'Ver ejercicios del día' : 'Show day exercises',
      collapseDay: isEs ? 'Ocultar ejercicios' : 'Hide exercises',
      emptyTitle: isEs ? 'Sin plan asignado' : 'No plan assigned',
      emptyBody: isEs
        ? 'Tu coach debe generar un programa en Motor WL y pulsar «Asignar al atleta». La demo también crea un plan automático la primera vez.'
        : 'Your coach should build a program in the WL Engine and tap “Assign to athlete”. The demo also seeds a plan on first load.',
    }),
    [isEs],
  );

  useEffect(() => {
    if (!weekData || !myAssignment) return;
    setExpandedDays((prev) => {
      const next = { ...prev };
      let setDefault = false;
      for (const day of weekData.days) {
        const k = dayKey(weekData.weekNumber, day.dayNumber);
        if (next[k] !== undefined) continue;
        if (!setDefault) {
          const done = isSessionComplete(
            myAssignment.id,
            weekData.weekNumber,
            day.dayNumber,
            day.session.exercises.length,
          );
          next[k] = !done;
          setDefault = true;
        } else {
          next[k] = false;
        }
      }
      return next;
    });
  }, [week, weekData, myAssignment, isSessionComplete]);

  if (!myAssignment || !program || !weekData) {
    return (
      <div className="wolf-athlete-plan wolf-athlete-plan--empty">
        <div className="wolf-athlete-empty-visual">
          <ClipboardList size={40} strokeWidth={1.35} />
        </div>
        <h2 className="wolf-athlete-empty-title">{t.emptyTitle}</h2>
        <p className="wolf-athlete-empty-text">{t.emptyBody}</p>
      </div>
    );
  }

  const toggleDayExpanded = (weekNumber: number, dayNumber: number) => {
    const k = dayKey(weekNumber, dayNumber);
    setExpandedDays((prev) => ({ ...prev, [k]: !prev[k] }));
  };

  return (
    <div className="wolf-athlete-plan">
      <header className="wolf-athlete-hero">
        <div className="wolf-athlete-hero-accent" aria-hidden />
        <div className="wolf-athlete-hero-inner">
          <div className="wolf-athlete-hero-main">
            <p className="wolf-athlete-kicker">
              <CalendarDays size={14} strokeWidth={2} aria-hidden />
              {t.kicker}
            </p>
            <h1 className="wolf-athlete-title">{t.title}</h1>
            <p className="wolf-athlete-program-name">{program.name}</p>
            {athleteProfile ? (
              <p className="wolf-athlete-athlete-name">
                <span className="wolf-athlete-athlete-label">{isEs ? 'Atleta' : 'Athlete'}</span>
                {athleteProfile.name}
              </p>
            ) : null}
          </div>

          <aside className="wolf-athlete-discipline" aria-label={t.discipline}>
            <div className="wolf-athlete-discipline-top">
              <TrendingUp size={18} strokeWidth={2} className="wolf-athlete-discipline-icon" aria-hidden />
              <div>
                <span className="wolf-athlete-discipline-label">{t.discipline}</span>
                <span className="wolf-athlete-discipline-sub">
                  {completedExercises}/{totalExercises} {t.exercisesDone}
                </span>
              </div>
              <span className="wolf-athlete-discipline-pct">{disciplinePct}%</span>
            </div>
            <div
              className="wolf-athlete-progress-track"
              role="progressbar"
              aria-valuenow={disciplinePct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="wolf-athlete-progress-fill" style={{ width: `${disciplinePct}%` }} />
            </div>
          </aside>
        </div>
      </header>

      <div className="wolf-athlete-week-section">
        <div className="wolf-athlete-week-label">
          {t.weekOf} {week} {t.of} {program.weeks.length}
        </div>
        <div className="wolf-athlete-week-nav" role="tablist">
          {program.weeks.map((w) => (
            <button
              key={w.weekNumber}
              type="button"
              role="tab"
              aria-selected={week === w.weekNumber}
              className={`wolf-athlete-week-pill ${week === w.weekNumber ? 'active' : ''}`}
              onClick={() => setWeek(w.weekNumber)}
            >
              W{w.weekNumber}
            </button>
          ))}
        </div>
      </div>

      <ul className="wolf-athlete-day-list">
        {weekData.days.map((day, dayIndex) => {
          const exerciseCount = day.session.exercises.length;
          const done = isSessionComplete(myAssignment.id, weekData.weekNumber, day.dayNumber, exerciseCount);
          const k = dayKey(weekData.weekNumber, day.dayNumber);
          const expanded = expandedDays[k] ?? false;
          const completedInDay = day.session.exercises.filter((_, bi) =>
            isExerciseComplete(myAssignment.id, weekData.weekNumber, day.dayNumber, bi),
          ).length;

          return (
            <li
              key={day.dayNumber}
              className={`wolf-athlete-day-card ${done ? 'wolf-athlete-day-card--done' : ''} ${expanded ? 'wolf-athlete-day-card--expanded' : 'wolf-athlete-day-card--collapsed'}`}
            >
              <div className="wolf-athlete-day-card__accent" aria-hidden />
              <div className="wolf-athlete-day-top">
                <button
                  type="button"
                  className="wolf-athlete-day-expand"
                  aria-expanded={expanded}
                  aria-label={expanded ? t.collapseDay : t.expandDay}
                  onClick={() => toggleDayExpanded(weekData.weekNumber, day.dayNumber)}
                >
                  <ChevronDown
                    size={20}
                    strokeWidth={2.25}
                    className={`wolf-athlete-day-chevron${expanded ? ' is-open' : ''}`}
                    aria-hidden
                  />
                </button>
                <div className="wolf-athlete-day-title-row">
                  <span className="wolf-athlete-day-badge" aria-hidden>
                    {dayIndex + 1}
                  </span>
                  <div>
                    <h3 className="wolf-athlete-day-title">{day.label}</h3>
                    <div className="wolf-athlete-metrics" role="list">
                      <span className="wolf-athlete-metric" role="listitem">
                        <Activity size={14} strokeWidth={2} aria-hidden />
                        K <strong>{day.session.kValue.toFixed(1)}</strong>
                      </span>
                      <span className="wolf-athlete-metric" role="listitem">
                        <Dumbbell size={14} strokeWidth={2} aria-hidden />
                        <strong>{day.session.load}</strong> kg
                      </span>
                      <span className="wolf-athlete-metric" role="listitem">
                        <Layers size={14} strokeWidth={2} aria-hidden />
                        <strong>{day.session.totalReps}</strong> {t.reps}
                      </span>
                      {exerciseCount > 0 ? (
                        <span className="wolf-athlete-metric wolf-athlete-metric--progress" role="listitem">
                          <CheckCircle2 size={14} strokeWidth={2} aria-hidden />
                          <strong>
                            {completedInDay}/{exerciseCount}
                          </strong>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className={`wolf-athlete-done-btn ${done ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSessionComplete(
                      myAssignment.id,
                      weekData.weekNumber,
                      day.dayNumber,
                      exerciseCount,
                    );
                  }}
                  aria-pressed={done}
                >
                  {done ? <CheckCircle2 size={20} strokeWidth={2.25} /> : <Circle size={20} strokeWidth={2} />}
                  <span>{done ? t.done : t.markDone}</span>
                </button>
              </div>

              {expanded ? (
                <div className="wolf-athlete-blocks">
                  {day.session.exercises.map((block, bi) => {
                    const complex = normalizeBlockType(block) === 'complex' && block.segments?.length;
                    const loadBaseExerciseId = complex
                      ? block.segments?.[0]?.exerciseId ?? block.exerciseId
                      : block.exerciseId;
                    const loadEx = motorExercises.find((e) => e.id === loadBaseExerciseId);
                    const baseOneRm =
                      athleteProfile && loadEx ? resolveBaseOneRm(loadEx, athleteProfile) : null;
                    const exerciseDone = isExerciseComplete(
                      myAssignment.id,
                      weekData.weekNumber,
                      day.dayNumber,
                      bi,
                    );

                    return (
                      <article
                        key={`${block.exerciseId}-${bi}`}
                        className={`wolf-athlete-exercise ${exerciseDone ? 'wolf-athlete-exercise--done' : ''}`}
                      >
                        <div className="wolf-athlete-exercise-head">
                          <div className="wolf-athlete-exercise-head-main">
                            {complex ? (
                              <span className="wolf-athlete-pill wolf-athlete-pill--complex">{t.complex}</span>
                            ) : (
                              <span className="wolf-athlete-pill wolf-athlete-pill--single">
                                {isEs ? 'Ejercicio' : 'Exercise'}
                              </span>
                            )}
                            <h4 className="wolf-athlete-exercise-title">
                              {complex
                                ? block.segments!.map((s) => exName(s.exerciseId)).join(' + ')
                                : exName(block.exerciseId)}
                            </h4>
                          </div>
                          <button
                            type="button"
                            className={`wolf-athlete-exercise-done-btn ${exerciseDone ? 'active' : ''}`}
                            aria-pressed={exerciseDone}
                            onClick={() =>
                              toggleExerciseComplete(
                                myAssignment.id,
                                weekData.weekNumber,
                                day.dayNumber,
                                bi,
                              )
                            }
                          >
                            {exerciseDone ? (
                              <CheckCircle2 size={18} strokeWidth={2.25} aria-hidden />
                            ) : (
                              <Circle size={18} strokeWidth={2} aria-hidden />
                            )}
                            <span>{exerciseDone ? t.exerciseDone : t.markExercise}</span>
                          </button>
                        </div>
                        <ul className="wolf-athlete-set-list" aria-label={isEs ? 'Series' : 'Sets'}>
                          {block.sets.map((row, si) => (
                            <li key={si} className="wolf-athlete-set-row">
                              {baseOneRm != null ? (
                                <span className="wolf-athlete-set-load">
                                  {Math.round((baseOneRm * row.percentage) / 100)} {t.kg}
                                </span>
                              ) : null}
                              <span className="wolf-athlete-set-pct">{row.percentage}%</span>
                              <span className="wolf-athlete-set-detail">
                                {complex ? (
                                  <>
                                    {block.segments!.map((seg, i) => (
                                      <React.Fragment key={`${seg.exerciseId}-${i}`}>
                                        {i > 0 ? <span className="wolf-athlete-set-sep">·</span> : null}
                                        <span className="wolf-athlete-set-move">
                                          <span className="wolf-athlete-set-move-name">
                                            {exName(seg.exerciseId)}
                                          </span>
                                          <span className="wolf-athlete-set-move-reps">
                                            {row.segmentReps?.[i] ?? '?'}
                                          </span>
                                        </span>
                                      </React.Fragment>
                                    ))}
                                  </>
                                ) : (
                                  <span className="wolf-athlete-set-simple-reps">
                                    {row.reps} {t.reps}
                                  </span>
                                )}
                              </span>
                              <span className="wolf-athlete-set-mult">{row.sets}×</span>
                            </li>
                          ))}
                        </ul>
                      </article>
                    );
                  })}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default AthleteTrainingView;
