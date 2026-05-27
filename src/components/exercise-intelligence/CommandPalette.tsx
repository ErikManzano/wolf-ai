import React, { useEffect, useMemo, useState } from 'react';
import { Command, Plus, Search } from 'lucide-react';
import type { MergedDefinitionView } from '../../models/exercise';

export interface CommandPaletteAction {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  isEs: boolean;
  definitions: MergedDefinitionView[];
  onClose: () => void;
  actions: CommandPaletteAction[];
  onSelectDefinition: (d: MergedDefinitionView) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  isEs,
  definitions,
  onClose,
  actions,
  onSelectDefinition,
}) => {
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const filteredDefs = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return definitions.slice(0, 8);
    return definitions
      .filter(
        (d) =>
          d.effectiveDisplayName.toLowerCase().includes(needle) ||
          d.searchText.includes(needle) ||
          d.tags.some((t) => t.includes(needle)),
      )
      .slice(0, 8);
  }, [definitions, q]);

  const filteredActions = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(needle));
  }, [actions, q]);

  if (!open) return null;

  return (
    <div className="wolf-ei-cmd-backdrop" role="presentation" onClick={onClose}>
      <div className="wolf-ei-cmd" role="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="wolf-ei-cmd__input-wrap">
          <Search size={18} />
          <input
            autoFocus
            type="text"
            placeholder={isEs ? 'Comando o movimiento…' : 'Command or movement…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
          />
          <kbd className="wolf-ei-kbd">esc</kbd>
        </div>
        <div className="wolf-ei-cmd__section">
          <span className="wolf-ei-cmd__label">{isEs ? 'Acciones' : 'Actions'}</span>
          {filteredActions.map((a) => (
            <button key={a.id} type="button" className="wolf-ei-cmd__item" onClick={() => { a.run(); onClose(); }}>
              <Command size={14} />
              <span>{a.label}</span>
              {a.hint && <kbd className="wolf-ei-kbd">{a.hint}</kbd>}
            </button>
          ))}
        </div>
        <div className="wolf-ei-cmd__section">
          <span className="wolf-ei-cmd__label">{isEs ? 'Movimientos' : 'Movements'}</span>
          {filteredDefs.map((d) => (
            <button
              key={d.id}
              type="button"
              className="wolf-ei-cmd__item"
              onClick={() => {
                onSelectDefinition(d);
                onClose();
              }}
            >
              <Plus size={14} style={{ opacity: 0.4 }} />
              <span>{d.effectiveDisplayName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
