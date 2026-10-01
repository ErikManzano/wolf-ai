import type { ProgramEnrollment } from '../../../models/coach-architecture';
import type { Athlete, Exercise, GeneratedProgram, ProgramWeek } from '../../../models/training';
import type { ProgramContextTabId, ProgramEditorMode } from './constants';
import { AthleteContextTab } from './AthleteContextTab';
import { DayContextTab } from './DayContextTab';
import { DayHistoryContextTab } from './DayHistoryContextTab';
import { WeekContextTab } from './WeekContextTab';
import { TemplateInstancesPanel } from './TemplateInstancesPanel';
import { ProgramContextSection } from './ProgramContextSection';
import { ProgramContextTabBar } from './ProgramContextTabBar';

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
  onEditPrs,
  enrolledAthletes = [],
  onOpenAssignment,
  dayMetricsAthlete = null,
  templateMetrics = false,
  selectedDayLabel,
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
  onEditPrs?: () => void;
  enrolledAthletes?: ProgramEnrollment[];
  onOpenAssignment?: (assignmentId: string) => void;
  /** Atleta usado en motor de métricas (puede existir sin preview en plantilla). */
  dayMetricsAthlete?: Athlete | null;
  templateMetrics?: boolean;
  selectedDayLabel?: string;
}) {
  const isTemplate = editorMode === 'template';
  const athleteForMetrics = previewAthlete;

  return (
    <div className="wl-program-context-panel">
      <ProgramContextTabBar
        isEs={isEs}
        editorMode={editorMode}
        activeTab={activeTab}
        onTabChange={onTabChange}
        instanceCount={enrolledAthletes.length}
      />

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
