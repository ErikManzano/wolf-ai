export type ProgramNavConfirmKind = 'removeWeek' | 'removeDay' | 'reorderWeek' | 'reorderDay';

export function programNavConfirmCopy(
  kind: ProgramNavConfirmKind,
  isEs: boolean,
  ctx: { weekNumber?: number; dayNumber?: number; from?: number; to?: number },
): { title: string; message: string; confirmLabel: string; danger: boolean } {
  const cancel = isEs ? 'Cancelar' : 'Cancel';

  switch (kind) {
    case 'removeWeek':
      return {
        title: isEs ? 'Eliminar semana' : 'Delete week',
        message: isEs
          ? `¿Eliminar la semana ${ctx.weekNumber} y todas sus sesiones? Esta acción no se puede deshacer.`
          : `Delete week ${ctx.weekNumber} and all its sessions? This cannot be undone.`,
        confirmLabel: isEs ? 'Eliminar' : 'Delete',
        danger: true,
      };
    case 'removeDay':
      return {
        title: isEs ? 'Eliminar día' : 'Delete day',
        message: isEs
          ? `¿Eliminar el día D${ctx.dayNumber} y su sesión? Esta acción no se puede deshacer.`
          : `Delete day D${ctx.dayNumber} and its session? This cannot be undone.`,
        confirmLabel: isEs ? 'Eliminar' : 'Delete',
        danger: true,
      };
    case 'reorderWeek':
      return {
        title: isEs ? 'Reordenar semanas' : 'Reorder weeks',
        message: isEs
          ? `¿Mover la semana ${ctx.from} al lugar de la semana ${ctx.to}? El contenido de cada semana se reordenará y renumerará.`
          : `Move week ${ctx.from} to week ${ctx.to}'s position? Week contents will be reordered and renumbered.`,
        confirmLabel: isEs ? 'Confirmar cambio' : 'Confirm change',
        danger: false,
      };
    case 'reorderDay':
      return {
        title: isEs ? 'Reordenar días' : 'Reorder days',
        message: isEs
          ? `¿Mover el día D${ctx.from} al lugar del D${ctx.to}? Las sesiones de la semana se reordenarán.`
          : `Move day D${ctx.from} to D${ctx.to}'s position? Sessions in this week will be reordered.`,
        confirmLabel: isEs ? 'Confirmar cambio' : 'Confirm change',
        danger: false,
      };
    default:
      return { title: '', message: '', confirmLabel: cancel, danger: false };
  }
}
