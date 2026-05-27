import React, { useState } from 'react';
import type {
  ExerciseComposition,
  ExerciseFamilyCode,
  ExerciseModifierCode,
  ExerciseTaxonomyBundle,
  ExerciseVariationCode,
  SegmentComposition,
  StartPositionCode,
} from '../../models/exercise';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

interface ComplexBuilderModalProps {
  open: boolean;
  isEs: boolean;
  taxonomy: ExerciseTaxonomyBundle;
  initial?: ExerciseComposition | null;
  onClose: () => void;
  onApply: (composition: ExerciseComposition) => void;
}

const emptySegment = (): SegmentComposition => ({
  family: 'clean',
  variation: 'power',
  startPosition: 'floor',
  modifiers: [],
});

const ComplexBuilderModal: React.FC<ComplexBuilderModalProps> = ({
  open,
  isEs,
  taxonomy,
  initial,
  onClose,
  onApply,
}) => {
  const [segments, setSegments] = useState<SegmentComposition[]>(() => {
    if (initial?.kind === 'complex') return [...initial.segments];
    return [emptySegment(), emptySegment()];
  });

  if (!open) return null;

  const updateSeg = (idx: number, patch: Partial<SegmentComposition>) => {
    setSegments((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const toggleMod = (idx: number, code: ExerciseModifierCode) => {
    setSegments((prev) =>
      prev.map((s, i) => {
        if (i !== idx) return s;
        const has = s.modifiers.includes(code);
        return {
          ...s,
          modifiers: has ? s.modifiers.filter((m) => m !== code) : [...s.modifiers, code],
        };
      }),
    );
  };

  return (
    <div className="confirm-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="confirm-modal-card"
        style={{ maxWidth: 560, maxHeight: '90vh', overflow: 'auto' }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 className="confirm-modal-title">{isEs ? 'Constructor de complejo' : 'Complex builder'}</h3>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {segments.map((seg, idx) => (
          <div key={idx} className="wolf-composer__panel" style={{ marginBottom: 10 }}>
            <strong>
              {isEs ? 'Movimiento' : 'Movement'} {idx + 1}
            </strong>
            <label className="wolf-composer__field">
              <span>{isEs ? 'Familia' : 'Family'}</span>
              <select
                value={seg.family}
                onChange={(e) => updateSeg(idx, { family: e.target.value as ExerciseFamilyCode })}
              >
                {taxonomy.families.map((f) => (
                  <option key={f.code} value={f.code}>
                    {isEs ? f.labelEs : f.labelEn}
                  </option>
                ))}
              </select>
            </label>
            <label className="wolf-composer__field">
              <span>{isEs ? 'Variación' : 'Variation'}</span>
              <select
                value={seg.variation}
                onChange={(e) => updateSeg(idx, { variation: e.target.value as ExerciseVariationCode })}
              >
                {taxonomy.variations.map((v) => (
                  <option key={v.code} value={v.code}>
                    {isEs ? v.labelEs : v.labelEn}
                  </option>
                ))}
              </select>
            </label>
            <label className="wolf-composer__field">
              <span>{isEs ? 'Posición' : 'Position'}</span>
              <select
                value={seg.startPosition}
                onChange={(e) => updateSeg(idx, { startPosition: e.target.value as StartPositionCode })}
              >
                {taxonomy.startPositions.map((p) => (
                  <option key={p.code} value={p.code}>
                    {isEs ? p.labelEs : p.labelEn}
                  </option>
                ))}
              </select>
            </label>
            <div className="wolf-composer__chips">
              {taxonomy.modifiers.map((m) => (
                <button
                  key={m.code}
                  type="button"
                  className={`wolf-composer__chip${seg.modifiers.includes(m.code as ExerciseModifierCode) ? ' active' : ''}`}
                  onClick={() => toggleMod(idx, m.code as ExerciseModifierCode)}
                >
                  {isEs ? m.labelEs : m.labelEn}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSegments((s) => [...s, emptySegment()].slice(0, 4))}
            disabled={segments.length >= 4}
          >
            {isEs ? '+ Segmento' : '+ Segment'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSegments((s) => (s.length > 2 ? s.slice(0, -1) : s))}
            disabled={segments.length <= 2}
          >
            {isEs ? 'Quitar último' : 'Remove last'}
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() =>
              onApply({
                kind: 'complex',
                segments,
                linker: 'same_bar',
              })
            }
          >
            {isEs ? 'Aplicar complejo' : 'Apply complex'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ComplexBuilderModal;
