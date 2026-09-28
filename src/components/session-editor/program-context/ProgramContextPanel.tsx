import type { ProgramEnrollment } from '../../../models/coach-architecture';
import type { Athlete, Exercise, GeneratedProgram, ProgramWeek, SessionExerciseBlock } from '../../../models/training';
import type { ProgramContextTabId, ProgramEditorMode } from './constants';
import { AthleteContextTab } from './AthleteContextTab';
import { DayContextTab } from './DayContextTab';
import { DayHistoryContextTab } from './DayHistoryContextTab';
import { WeekContextTab } from './WeekContextTab';
import { ExerciseContextCard } from './ExerciseContextCard';
import { TemplateInstancesPanel } from './TemplateInstancesPanel';
import { ProgramContextSection } from './ProgramContextSection';

export function ProgramContextPanel({
  isEs,
  editorMode = 'instance',
  activeTab,
  onTabChange,
  program,
  weekNumber,
  dayNumber,
  weekData,
  previousWeekData,
  previewAthlete,
  exercises,
  selectedBlock,
  onEditPrs,
  enrolledAthletes = [],
  onOpenAssignment,
  dayMetricsAthlete = null,
  templateMetrics = false,
  selectedDayLabel,
  onClearExerciseSelection,
}: {
  isEs: boolean;
  editorMode?: ProgramEditorMode;
  activeTab: ProgramContextTabId;
  onTabChange: (tab: ProgramContextTabId) => void;
  program: GeneratedProgram;
  weekNumber: number;
  dayNumber: number;
  weekData?: ProgramWeek;
  previousWeekData?: ProgramWeek;
  previewAthlete: Athlete | null;
  exercises: Exercise[];
  selectedBlock: SessionExerciseBlock | null;
  onEditPrs?: () => void;
  enrolledAthletes?: ProgramEnrollment[];
  onOpenAssignment?: (assignmentId: string) => void;
  /** Atleta usado en motor de métricas (puede existir sin preview en plantilla). */
  dayMetricsAthlete?: Athlete | null;
  templateMetrics?: boolean;
  selectedDayLabel?: string;
  onClearExerciseSelection?: () => void;
}) {
  const isTemplate = editorMode === 'template';
  const athleteForMetrics = previewAthlete;

  const tabs: { id: ProgramContextTabId; label: string }[] = isTemplate
    ? [
        { id: 'day', label: isEs ? 'Día' : 'Day' },
        { id: 'week', label: isEs ? 'Semana' : 'Week' },
        { id: 'history', label: isEs ? 'Histórico' : 'History' },
        {
          id: 'instances',
          label: isEs ? `Inst. (${enrolledAthletes.length})` : `Inst. (${enrolledAthletes.length})`,
        },
      ]
    : [
        { id: 'day', label: isEs ? 'Día' : 'Day' },
        { id: 'week', label: isEs ? 'Semana' : 'Week' },
        { id: 'history', label: isEs ? 'Histórico' : 'History' },
        { id: 'athlete', label: isEs ? 'Atleta' : 'Athlete' },
      ];

  return (
    <div className="wl-program-context-panel">
      {selectedBlock ? (
        <ExerciseContextCard
          program={program}
          block={selectedBlock}
          athlete={previewAthlete}
          exercises={exercises}
          weekNumber={weekNumber}
          dayNumber={dayNumber}
          isEs={isEs}
          isTemplate={isTemplate}
          onDismiss={onClearExerciseSelection}
        />
      ) : null}
      <div className="wl-program-context-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`wl-program-context-tabs__btn${activeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="wl-program-context-panel__body">
        {activeTab === 'instances' ? (
          <TemplateInstancesPanel
            isEs={isEs}
            enrollments={enrolledAthletes}
            onOpenAssignment={onOpenAssignment}
          />
        ) : null}
        {activeTab === 'athlete' ? (
          <AthleteContextTab
            athlete={previewAthlete}
            weekNumber={weekNumber}
            dayNumber={dayNumber}
            isEs={isEs}
            onEditPrs={onEditPrs}
          />
        ) : null}
        {activeTab === 'week' && athleteForMetrics ? (
          <WeekContextTab
            program={program}
            weekNumber={weekNumber}
            weekData={weekData}
            previousWeekData={previousWeekData}
            athlete={athleteForMetrics}
            exercises={exercises}
            isEs={isEs}
          />
        ) : null}
        {activeTab === 'week' && !athleteForMetrics ? (
          <div className="wl-program-context-tab">
            <ProgramContextSection title={isEs ? 'Semana' : 'Week'}>
              <p className="wl-program-context-empty">
                {isTemplate
                  ? isEs
                    ? 'Comparativa con kg en el plan individual del atleta (pestaña Instancias).'
                    : 'Kg comparisons live on each athlete plan (Instances tab).'
                  : isEs
                    ? 'Selecciona un atleta para comparativa semanal.'
                    : 'Select an athlete for week comparison.'}
              </p>
            </ProgramContextSection>
          </div>
        ) : null}
        {activeTab === 'day' && dayMetricsAthlete ? (
          <DayContextTab
            program={program}
            weekNumber={weekNumber}
            dayNumber={dayNumber}
            dayLabel={selectedDayLabel}
            athlete={dayMetricsAthlete}
            exercises={exercises}
            isEs={isEs}
            templateMetrics={templateMetrics}
          />
        ) : null}
        {activeTab === 'day' && !dayMetricsAthlete ? (
          <div className="wl-program-context-tab">
            <ProgramContextSection title={isEs ? 'Día' : 'Day'}>
              <p className="wl-program-context-empty">
                {isTemplate
                  ? isEs
                    ? 'Comparativa del día con kg en el plan individual (Instancias).'
                    : 'Day kg comparisons live on individual athlete plans (Instances).'
                  : isEs
                    ? 'Selecciona un atleta para métricas del día.'
                    : 'Select an athlete for day metrics.'}
              </p>
            </ProgramContextSection>
          </div>
        ) : null}
        {activeTab === 'history' && dayMetricsAthlete ? (
          <DayHistoryContextTab
            program={program}
            weekNumber={weekNumber}
            dayNumber={dayNumber}
            dayLabel={selectedDayLabel}
            athlete={dayMetricsAthlete}
            exercises={exercises}
            isEs={isEs}
            templateMetrics={templateMetrics}
          />
        ) : null}
        {activeTab === 'history' && !dayMetricsAthlete ? (
          <div className="wl-program-context-tab">
            <ProgramContextSection title={isEs ? 'Histórico' : 'History'}>
              <p className="wl-program-context-empty">
                {isTemplate
                  ? isEs
                    ? 'Histórico con kg en el plan individual (Instancias).'
                    : 'History with kg on individual athlete plans (Instances).'
                  : isEs
                    ? 'Selecciona un atleta para el histórico del día.'
                    : 'Select an athlete for day history.'}
              </p>
            </ProgramContextSection>
          </div>
        ) : null}
      </div>
    </div>
  );
}
