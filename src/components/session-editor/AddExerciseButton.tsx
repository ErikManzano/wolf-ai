import React from 'react';
import { Plus } from 'lucide-react';

interface AddExerciseButtonProps {
  isEs: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: 'primary' | 'outline' | 'footer';
  className?: string;
}

export const AddExerciseButton: React.FC<AddExerciseButtonProps> = ({
  isEs,
  disabled,
  onClick,
  variant = 'outline',
  className = '',
}) => {
  const cls =
    variant === 'primary'
      ? 'wolf-se-btn wolf-se-btn--primary'
      : variant === 'footer'
        ? 'wolf-se-btn wolf-se-btn--ghost wolf-se-btn--block'
        : 'wolf-se-btn wolf-se-btn--outline wolf-se-btn--block';

  return (
    <button type="button" className={`${cls} ${className}`.trim()} disabled={disabled} onClick={onClick}>
      <Plus size={16} />
      {isEs ? 'Añadir ejercicio' : 'Add exercise'}
    </button>
  );
};
