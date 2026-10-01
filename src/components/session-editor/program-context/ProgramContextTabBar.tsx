import { CalendarDays, CalendarRange, History, User, Users } from 'lucide-react';
import type { ProgramContextTabId, ProgramEditorMode } from './constants';

export function ProgramContextTabBar({
  isEs,
  editorMode = 'instance',
  activeTab,
  onTabChange,
  instanceCount = 0,
  variant = 'panel',
}: {
  isEs: boolean;
  editorMode?: ProgramEditorMode;
  activeTab: ProgramContextTabId;
  onTabChange: (tab: ProgramContextTabId) => void;
  instanceCount?: number;
  variant?: 'panel' | 'dock';
}) {
  const tabs: { id: ProgramContextTabId; label: string; icon: typeof CalendarDays }[] =
    editorMode === 'template'
      ? [
          { id: 'day', label: isEs ? 'Día' : 'Day', icon: CalendarDays },
          { id: 'week', label: isEs ? 'Semana' : 'Week', icon: CalendarRange },
          { id: 'history', label: isEs ? 'Histórico' : 'History', icon: History },
          {
            id: 'instances',
            label: isEs ? `Inst. (${instanceCount})` : `Inst. (${instanceCount})`,
            icon: Users,
          },
        ]
      : [
          { id: 'day', label: isEs ? 'Día' : 'Day', icon: CalendarDays },
          { id: 'week', label: isEs ? 'Semana' : 'Week', icon: CalendarRange },
          { id: 'history', label: isEs ? 'Histórico' : 'History', icon: History },
          { id: 'athlete', label: isEs ? 'Atleta' : 'Athlete', icon: User },
        ];

  return (
    <div
      className={`wl-program-context-tabs${variant === 'dock' ? ' wl-program-context-tabs--dock' : ''}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`wl-program-context-tabs__btn${activeTab === tab.id ? ' is-active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <Icon size={14} strokeWidth={2.25} aria-hidden />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
