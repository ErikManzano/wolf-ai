import React from 'react';
import { Send } from 'lucide-react';

interface WlProgramPublishButtonProps {
  isEs: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
}

/** Full-width publish CTA — solid green, distinct from dashed “add exercise”. */
export const WlProgramPublishButton: React.FC<WlProgramPublishButtonProps> = ({
  isEs,
  disabled,
  loading,
  onClick,
}) => (
  <button
    type="button"
    className={`wl-programs-publish-btn${loading ? ' wl-programs-publish-btn--loading' : ''}`}
    disabled={disabled || loading}
    onClick={onClick}
  >
    <span className="wl-programs-publish-btn__icon" aria-hidden>
      <Send size={18} strokeWidth={2.25} />
    </span>
    <span className="wl-programs-publish-btn__text">
      {loading
        ? isEs
          ? 'Publicando…'
          : 'Publishing…'
        : isEs
          ? 'Publicar plan'
          : 'Publish plan'}
    </span>
  </button>
);
