import React, { useEffect, useState } from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';

export type WlListViewMode = 'table' | 'cards';

const STORAGE_PREFIX = 'wolf_wl_mgmt_view_';

interface WlViewModeToggleProps {
  storageKey: string;
  isEs: boolean;
  value?: WlListViewMode;
  onChange?: (mode: WlListViewMode) => void;
}

function readStored(key: string): WlListViewMode {
  try {
    const v = localStorage.getItem(STORAGE_PREFIX + key);
    if (v === 'table' || v === 'cards') return v;
  } catch {
    /* ignore */
  }
  return 'table';
}

export function useWlListViewMode(storageKey: string): [WlListViewMode, (mode: WlListViewMode) => void] {
  const [mode, setMode] = useState<WlListViewMode>(() => readStored(storageKey));

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFIX + storageKey, mode);
    } catch {
      /* ignore */
    }
  }, [storageKey, mode]);

  return [mode, setMode];
}

const WlViewModeToggle: React.FC<WlViewModeToggleProps> = ({
  storageKey,
  isEs,
  value: controlled,
  onChange,
}) => {
  const [internal, setInternal] = useWlListViewMode(storageKey);
  const mode = controlled ?? internal;
  const setMode = onChange ?? setInternal;

  return (
    <div className="wl-mgmt-view-toggle" role="group" aria-label={isEs ? 'Modo de vista' : 'View mode'}>
      <button
        type="button"
        className={`wl-mgmt-view-toggle-btn ${mode === 'table' ? 'active' : ''}`}
        aria-pressed={mode === 'table'}
        onClick={() => setMode('table')}
        title={isEs ? 'Vista tabla' : 'Table view'}
      >
        <Table2 size={16} aria-hidden />
        <span>{isEs ? 'Tabla' : 'Table'}</span>
      </button>
      <button
        type="button"
        className={`wl-mgmt-view-toggle-btn ${mode === 'cards' ? 'active' : ''}`}
        aria-pressed={mode === 'cards'}
        onClick={() => setMode('cards')}
        title={isEs ? 'Vista tarjetas' : 'Card view'}
      >
        <LayoutGrid size={16} aria-hidden />
        <span>{isEs ? 'Tarjetas' : 'Cards'}</span>
      </button>
    </div>
  );
};

export default WlViewModeToggle;
