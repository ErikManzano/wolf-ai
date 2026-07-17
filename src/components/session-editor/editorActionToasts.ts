import type { PushWolfAlertInput } from '../../context/WolfAlertContext';

/** Short coach-facing toasts for structural editor actions. */
export function editorActionToast(
  isEs: boolean,
  action:
    | 'duplicateBlock'
    | 'removeBlock'
    | 'addBlock'
    | 'duplicateExercise'
    | 'removeExercise'
    | 'addMovement'
    | 'removeMovement',
): PushWolfAlertInput {
  switch (action) {
    case 'duplicateBlock':
      return {
        tone: 'success',
        title: isEs ? 'Bloque duplicado' : 'Block duplicated',
        message: isEs ? 'Se añadió una copia del bloque.' : 'A copy of the block was added.',
        durationMs: 2800,
      };
    case 'removeBlock':
      return {
        tone: 'success',
        title: isEs ? 'Bloque eliminado' : 'Block removed',
        message: isEs ? 'El bloque se quitó de la sesión.' : 'The block was removed from the session.',
        durationMs: 2800,
      };
    case 'addBlock':
      return {
        tone: 'success',
        title: isEs ? 'Bloque añadido' : 'Block added',
        message: isEs ? 'Nuevo bloque en la prescripción.' : 'New block added to the prescription.',
        durationMs: 2800,
      };
    case 'duplicateExercise':
      return {
        tone: 'success',
        title: isEs ? 'Ejercicio duplicado' : 'Exercise duplicated',
        message: isEs ? 'Se añadió una copia del ejercicio.' : 'A copy of the exercise was added.',
        durationMs: 2800,
      };
    case 'removeExercise':
      return {
        tone: 'success',
        title: isEs ? 'Ejercicio eliminado' : 'Exercise removed',
        message: isEs ? 'El ejercicio se quitó del día.' : 'The exercise was removed from the day.',
        durationMs: 2800,
      };
    case 'addMovement':
      return {
        tone: 'success',
        title: isEs ? 'Movimiento añadido' : 'Movement added',
        message: isEs ? 'Nuevo movimiento en el complejo.' : 'New movement added to the complex.',
        durationMs: 2800,
      };
    case 'removeMovement':
      return {
        tone: 'success',
        title: isEs ? 'Movimiento eliminado' : 'Movement removed',
        message: isEs ? 'Se quitó el movimiento del complejo.' : 'The movement was removed from the complex.',
        durationMs: 2800,
      };
  }
}
